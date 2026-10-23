import type { Quote, Candle, Timeframe } from '../../types/market';
import type { QuoteCallback, Unsubscribe } from '../types';
import { BINANCE_SYMBOLS } from '../../data/assets';
import { ENV } from '../../config/env';
import { TIMERS } from '../../config/constants';
import { generateFallbackCandles } from './syntheticAdapter';
import { fetchCandles as fetchYahooCandles } from './yahooAdapter';

function toYahooCryptoSymbol(symbol: string): string {
  if (symbol.endsWith('USDT')) {
    return symbol.replace('USDT', '-USD');
  }
  return symbol;
}

const listeners = new Map<string, Set<QuoteCallback>>();
let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let wsReconnectAttempts = 0;
const BINANCE_OFFLINE_KEY = 'dt_binance_offline_until';

function getBinanceOfflineUntil(): number {
  try {
    return Number(localStorage.getItem(BINANCE_OFFLINE_KEY) || sessionStorage.getItem(BINANCE_OFFLINE_KEY) || 0);
  } catch {
    return 0;
  }
}

function setBinanceOfflineUntil(ts: number): void {
  try {
    localStorage.setItem(BINANCE_OFFLINE_KEY, String(ts));
    sessionStorage.setItem(BINANCE_OFFLINE_KEY, String(ts));
  } catch { /* ok */ }
}

function connectBinance(): void {
  // If Binance is currently in circuit-breaker (geo-blocked), don't attempt connections
  if (Date.now() < getBinanceOfflineUntil()) return;
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  const streams = BINANCE_SYMBOLS.map(s => `${s}@ticker`).join('/');
  try {
    ws = new WebSocket(`${ENV.BINANCE_WS_URL}/${streams}`);
  } catch {
    setBinanceOfflineUntil(Date.now() + 60 * 60_000);
    return;
  }

  ws.onopen = () => {
    wsReconnectAttempts = 0;
  };

  ws.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      const raw = d.data || d;
      if (!raw.s) return;
      const quote: Quote = {
        symbol: raw.s as string,
        price: parseFloat(raw.c),
        change: parseFloat(raw.p),
        changePct: parseFloat(raw.P),
        high24h: parseFloat(raw.h),
        low24h: parseFloat(raw.l),
        volume: parseFloat(raw.v),
        timestamp: Date.now(),
      };
      listeners.get(quote.symbol)?.forEach(cb => cb(quote));
      listeners.get('*')?.forEach(cb => cb(quote));
    } catch {
      // ignore parse issues on malformed frames
    }
  };

  ws.onclose = () => {
    if (!reconnectTimeout && Date.now() >= getBinanceOfflineUntil()) {
      wsReconnectAttempts++;
      if (wsReconnectAttempts >= 2) {
        setBinanceOfflineUntil(Date.now() + 60 * 60_000);
        console.info('[Binance WS] Geo-blocked in current region. Fallback engine active. Pausing retries for 1h.');
        return;
      }
      const delay = Math.min(TIMERS.WS_RECONNECT_DELAY_MS * Math.pow(2, Math.min(wsReconnectAttempts - 1, 4)), 60_000);
      reconnectTimeout = setTimeout(connectBinance, delay);
    }
  };

  ws.onerror = () => {
    // Immediate 1-hour circuit breaker on geo-block to protect console from repeated connection failures
    setBinanceOfflineUntil(Date.now() + 60 * 60_000);
    try { ws?.close(); } catch { /* ok */ }
  };
}

export function subscribeLiveQuote(symbol: string, cb: QuoteCallback): Unsubscribe {
  const key = symbol.toUpperCase();
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(cb);
  if (Date.now() >= getBinanceOfflineUntil() && (!ws || ws.readyState > 1)) {
    connectBinance();
  }
  return () => {
    listeners.get(key)?.delete(cb);
  };
}

export function subscribeAllQuotes(cb: QuoteCallback): Unsubscribe {
  return subscribeLiveQuote('*', cb);
}

const BINANCE_TF: Record<Timeframe, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '1D': '1d'
};

const candleCache = new Map<string, { data: Candle[]; ts: number }>();

export async function fetchBinanceCandles(symbol: string, tf: Timeframe, signal?: AbortSignal): Promise<Candle[]> {
  const cacheKey = `${symbol}-${tf}`;
  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < ENV.CANDLE_CACHE_TTL_MS) return cached.data;

  // Circuit breaker: If Binance was recently detected as unreachable/blocked, fallback to real Yahoo candles
  if (Date.now() < getBinanceOfflineUntil()) {
    try {
      const realCandles = await fetchYahooCandles(toYahooCryptoSymbol(symbol), tf, signal);
      if (realCandles && realCandles.length > 5) {
        candleCache.set(cacheKey, { data: realCandles, ts: Date.now() });
        return realCandles;
      }
    } catch { /* proceed to synthetic */ }
    const fallback = generateFallbackCandles(symbol, tf);
    candleCache.set(cacheKey, { data: fallback, ts: Date.now() });
    return fallback;
  }

  // Aggressive 2.5-second timeout to prevent chart hangs on geo-blocked mobile networks
  const BINANCE_TIMEOUT_MS = 2_500;
  const timeoutController = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, BINANCE_TIMEOUT_MS);

  const onCallerAbort = () => {
    timeoutController.abort();
  };
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    }
    signal.addEventListener('abort', onCallerAbort, { once: true });
  }

  try {
    const limit = tf === '1D' ? 365 : 150;
    const url = `${ENV.BINANCE_REST_URL}/api/v3/klines?symbol=${symbol}&interval=${BINANCE_TF[tf]}&limit=${limit}`;
    const res = await fetch(url, { signal: timeoutController.signal });
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onCallerAbort);

    if (!res.ok) {
      const fallback = generateFallbackCandles(symbol, tf);
      candleCache.set(cacheKey, { data: fallback, ts: Date.now() });
      return fallback;
    }

    const data: number[][] = await res.json();
    const candles: Candle[] = data.map(k => ({
      time:   Math.floor(k[0] / 1000),
      open:   parseFloat(k[1] as unknown as string),
      high:   parseFloat(k[2] as unknown as string),
      low:    parseFloat(k[3] as unknown as string),
      close:  parseFloat(k[4] as unknown as string),
      volume: parseFloat(k[5] as unknown as string),
    }));
    candleCache.set(cacheKey, { data: candles, ts: Date.now() });
    return candles;
  } catch (e: unknown) {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onCallerAbort);

    // If caller explicitly aborted before timeout, rethrow so caller's state handles cancellation
    if (signal?.aborted && !timedOut) {
      throw e;
    }

    // Network timeout or blocked connection: Trip circuit breaker for 1 hour and fallback to real Yahoo candles
    setBinanceOfflineUntil(Date.now() + 60 * 60_000);
    try {
      const realCandles = await fetchYahooCandles(toYahooCryptoSymbol(symbol), tf, signal);
      if (realCandles && realCandles.length > 5) {
        candleCache.set(cacheKey, { data: realCandles, ts: Date.now() });
        return realCandles;
      }
    } catch { /* proceed to synthetic */ }

    console.warn(`[Binance] Unreachable or timed out for ${symbol}. Using synthetic fallback candles.`);
    const fallback = generateFallbackCandles(symbol, tf);
    candleCache.set(cacheKey, { data: fallback, ts: Date.now() });
    return fallback;
  }
}
