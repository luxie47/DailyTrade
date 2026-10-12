import type { Quote, Candle, Timeframe } from '../../types/market';
import type { QuoteCallback, Unsubscribe } from '../types';
import { BINANCE_SYMBOLS } from '../../data/assets';
import { ENV } from '../../config/env';
import { TIMERS } from '../../config/constants';
import { generateFallbackCandles } from './syntheticAdapter';

const listeners = new Map<string, Set<QuoteCallback>>();
let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function connectBinance(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  const streams = BINANCE_SYMBOLS.map(s => `${s}@ticker`).join('/');
  try {
    ws = new WebSocket(`${ENV.BINANCE_WS_URL}/${streams}`);
  } catch {
    return;
  }

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
    if (!reconnectTimeout) {
      reconnectTimeout = setTimeout(connectBinance, TIMERS.WS_RECONNECT_DELAY_MS);
    }
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function subscribeLiveQuote(symbol: string, cb: QuoteCallback): Unsubscribe {
  const key = symbol.toUpperCase();
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(cb);
  if (!ws || ws.readyState > 1) connectBinance();
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

  try {
    const limit = tf === '1D' ? 365 : 150;
    const url = `${ENV.BINANCE_REST_URL}/api/v3/klines?symbol=${symbol}&interval=${BINANCE_TF[tf]}&limit=${limit}`;
    const combinedSignal = signal ?? AbortSignal.timeout(ENV.DEFAULT_TIMEOUT_MS);
    const res = await fetch(url, { signal: combinedSignal });
    if (!res.ok) return generateFallbackCandles(symbol, tf);
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
    if ((e as Error)?.name === 'AbortError') throw e;
    return generateFallbackCandles(symbol, tf);
  }
}
