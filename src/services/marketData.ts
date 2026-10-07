import type { Quote, Candle, Timeframe, AngelId } from '../types/market';
import { BINANCE_SYMBOLS, ASSETS } from '../data/assets';

// ─── Angel Bridge (personal SmartAPI feed for Nifty/BankNifty/Sensex) ─────────
// The bridge URL is the only thing stored in-app — no broker secrets, ever.
// When unset (default) everything behaves exactly as before (Yahoo).
const ANGEL_URL_KEY = 'dailytrade_angel_bridge';

export function getBridgeUrl(): string {
  try { return (localStorage.getItem(ANGEL_URL_KEY) ?? '').replace(/\/+$/, ''); }
  catch { return ''; }
}

export function setBridgeUrl(url: string): void {
  try {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean) localStorage.setItem(ANGEL_URL_KEY, clean);
    else localStorage.removeItem(ANGEL_URL_KEY);
    angelCache = null; // force fresh fetch against the new URL
  } catch { /* private mode — bridge simply stays off */ }
}

export async function testBridge(url: string): Promise<string> {
  const clean = url.trim().replace(/\/+$/, '');
  if (!clean) return 'Enter your bridge URL first (https://….onrender.com).';
  try {
    const res = await fetch(`${clean}/health`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return `Bridge answered HTTP ${res.status} — check the URL.`;
    const h = await res.json();
    if (h.connected) return 'Angel connected — live ticks flowing.';
    if (h.market_open === false) return 'Bridge reachable, market closed — will go live at 09:15 IST.';
    return 'Bridge reachable but socket not connected yet — give it a minute.';
  } catch {
    return 'Bridge not reachable — is it deployed? (Render free sleeps when idle; first load wakes it.)';
  }
}

const QUOTE_TO_ANGEL = new Map<string, AngelId>(
  ASSETS.filter(a => a.angelId).map(a => [a.quoteSymbol, a.angelId as AngelId])
);

interface AngelLtp { market_open: boolean; stale: boolean; data: Record<string, { price: number | null; ts: string | null }> }
let angelCache: { ts: number; data: AngelLtp } | null = null;
const ANGEL_TTL_MS = 5000;

async function fetchAngelLtp(): Promise<AngelLtp | null> {
  const base = getBridgeUrl();
  if (!base) return null;
  if (angelCache && Date.now() - angelCache.ts < ANGEL_TTL_MS) return angelCache.data;
  try {
    const res = await fetch(`${base}/ltp`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return angelCache?.data ?? null;
    const data = (await res.json()) as AngelLtp;
    angelCache = { ts: Date.now(), data };
    return data;
  } catch {
    return angelCache?.data ?? null; // brief blips keep serving the last good read
  }
}

/**
 * Overlay a live Angel price onto a Yahoo-built quote. Change stays anchored
 * to Yahoo's official previous close; only the live price swaps in — and only
 * while the bridge reports the market open with a real tick. Anything else
 * falls back to the untouched Yahoo quote. Never throws.
 */
export async function applyAngelOverlay(quoteSymbol: string, quote: Quote): Promise<Quote> {
  try {
    if (!QUOTE_TO_ANGEL.has(quoteSymbol)) return quote;
    const ltp = await fetchAngelLtp();
    if (!ltp || ltp.stale || !ltp.market_open) return quote;
    const tick = ltp.data[QUOTE_TO_ANGEL.get(quoteSymbol)!];
    if (!tick || typeof tick.price !== 'number' || tick.price <= 0) return quote;
    const prevClose = quote.price - quote.change; // exact inverse of Yahoo construction
    if (!(prevClose > 0)) return quote;
    const change = tick.price - prevClose;
    return { ...quote, price: tick.price, change,
             changePct: (change / prevClose) * 100,
             timestamp: Date.now(), source: 'angel' as const };
  } catch {
    return quote;
  }
}

// ─── Binance Crypto WebSocket ─────────────────────────────────────────────────
const BINANCE_WS = 'wss://stream.binance.com:9443/ws';

type QuoteCallback = (quote: Quote) => void;
const listeners = new Map<string, Set<QuoteCallback>>();

let ws: WebSocket | null = null;

function connectBinance() {
  const streams = BINANCE_SYMBOLS.map(s => `${s}@ticker`).join('/');
  try {
    ws = new WebSocket(`${BINANCE_WS}/${streams}`);
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
        source: 'binance',
      };
      listeners.get(quote.symbol)?.forEach(cb => cb(quote));
      listeners.get('*')?.forEach(cb => cb(quote));
    } catch { /* ignore */ }
  };

  ws.onclose = () => {
    setTimeout(connectBinance, 3000);
  };

  ws.onerror = () => ws?.close();
}

export function subscribeLiveQuote(symbol: string, cb: QuoteCallback): () => void {
  const key = symbol.toUpperCase();
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(cb);
  if (!ws || ws.readyState > 1) connectBinance();
  return () => listeners.get(key)?.delete(cb);
}

export function subscribeAllQuotes(cb: QuoteCallback): () => void {
  return subscribeLiveQuote('*', cb);
}

// ─── Micro-Tick Synthetic Engine (24/7 continuous live updates) ───────────────
const syntheticPrices = new Map<string, number>();

function gbmTick(price: number): number {
  const sigma = 0.0004; // realistic live volatility
  const shock = (Math.random() - 0.498) * 2 * sigma;
  return Math.max(price * (1 + shock), 0.00001);
}

export function startSyntheticTicks(
  symbol: string,
  seedPrice: number,
  cb: (price: number) => void,
  intervalMs = 1200
): () => void {
  syntheticPrices.set(symbol, seedPrice);
  const id = setInterval(() => {
    const prev = syntheticPrices.get(symbol) ?? seedPrice;
    const next = gbmTick(prev);
    syntheticPrices.set(symbol, next);
    cb(next);
  }, intervalMs);
  return () => clearInterval(id);
}

// ─── Yahoo Finance Helpers & Multi-tier Fetcher ───────────────────────────────
const TF_PARAMS: Record<Timeframe, { interval: string; range: string; seconds: number }> = {
  '1m':  { interval: '1m',  range: '1d',  seconds: 60 },
  '5m':  { interval: '5m',  range: '5d',  seconds: 300 },
  '15m': { interval: '15m', range: '5d',  seconds: 900 },
  '1h':  { interval: '60m', range: '1mo', seconds: 3600 },
  '1D':  { interval: '1d',  range: '1y',  seconds: 86400 },
};

// Returns candidate URLs: 1) native direct if Capacitor, 2) local Vite dev proxy, 3) AllOrigins CORS fallback
function getYahooUrls(path: string): string[] {
  const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost' && !isCapacitor;
  const rawUrl = `https://query1.finance.yahoo.com${path}`;
  const urls: string[] = [];

  if (isCapacitor) {
    // In native Android APK, Capacitor native HTTP has zero CORS restrictions
    urls.push(rawUrl);
    urls.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`);
    return urls;
  }

  if (isDev) {
    urls.push(`/api/yahoo${path}`);
  }
  urls.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`);
  urls.push(rawUrl);
  return urls;
}

async function fetchYahooJson(path: string, signal?: AbortSignal): Promise<any> {
  const urls = getYahooUrls(path);
  for (const u of urls) {
    try {
      const fetchSignal = signal ?? AbortSignal.timeout(6000);
      const res = await fetch(u, { signal: fetchSignal });
      if (!res.ok) continue;
      const json = await res.json();
      if (json?.chart?.result?.[0]) return json;
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e; // propagate abort, don't swallow
      // try next fallback
    }
  }
  return null;
}

// ─── Single Yahoo Quote ───────────────────────────────────────────────────────
export async function fetchYahooQuote(symbol: string): Promise<Quote | null> {
  const json = await fetchYahooJson(`/v8/finance/chart/${symbol}?interval=1d&range=5d`);
  if (!json) return null;
  const r = json.chart.result[0];
  const meta = r?.meta;
  if (!meta || !meta.regularMarketPrice) return null;

  const price = meta.regularMarketPrice;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - prevClose;
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

  const yahooQuote: Quote = {
    symbol,
    price,
    change,
    changePct,
    high24h: meta.regularMarketDayHigh ?? price,
    low24h:  meta.regularMarketDayLow  ?? price,
    volume:  meta.regularMarketVolume  ?? 0,
    timestamp: Date.now(),
    source: 'yahoo',
  };

  // Angel bridge (if configured): live price swaps in, Yahoo stays as fallback.
  return applyAngelOverlay(symbol, yahooQuote);
}

// ─── Batch Quotes (in parallel chunks of 10) ──────────────────────────────────
export async function fetchBatchYahooQuotes(symbols: string[]): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  if (!symbols.length) return out;

  // Process in concurrent batches of 8
  const BATCH_SIZE = 8;
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const chunk = symbols.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async (s) => {
        try {
          const q = await fetchYahooQuote(s);
          if (q) out[s] = q;
        } catch { /* ignore individual fail */ }
      })
    );
  }
  return out;
}

// ─── Candle Cache (5-minute TTL) ─────────────────────────────────────────────
const candleCache = new Map<string, { data: Candle[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// ─── Historical Candles ───────────────────────────────────────────────────────
export async function fetchCandles(symbol: string, tf: Timeframe, signal?: AbortSignal): Promise<Candle[]> {
  const cacheKey = `${symbol}-${tf}`;
  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;
  try {
    const { interval, range } = TF_PARAMS[tf];
    const json = await fetchYahooJson(`/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`, signal);
    if (!json) return generateFallbackCandles(symbol, tf);

    const result = json?.chart?.result?.[0];
    if (!result) return generateFallbackCandles(symbol, tf);

    const timestamps: number[] = result.timestamp ?? [];
    const ohlcv = result.indicators?.quote?.[0];
    if (!ohlcv || !timestamps.length) return generateFallbackCandles(symbol, tf);

    const validCandles = timestamps.map((t, i) => ({
      time: t,
      open:   ohlcv.open?.[i]   ?? 0,
      high:   ohlcv.high?.[i]   ?? 0,
      low:    ohlcv.low?.[i]    ?? 0,
      close:  ohlcv.close?.[i]  ?? 0,
      volume: ohlcv.volume?.[i] ?? 0,
    })).filter(c => c.open > 0 && c.close > 0);

    const result2 = validCandles.length > 5 ? validCandles : generateFallbackCandles(symbol, tf);
    candleCache.set(cacheKey, { data: result2, ts: Date.now() });
    return result2;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    return generateFallbackCandles(symbol, tf);
  }
}

// ─── Binance Historical Candles (Crypto) ──────────────────────────────────────
const BINANCE_TF: Record<Timeframe, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '1D': '1d'
};

export async function fetchBinanceCandles(symbol: string, tf: Timeframe, signal?: AbortSignal): Promise<Candle[]> {
  const cacheKey = `${symbol}-${tf}`;
  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;
  try {
    const limit = tf === '1D' ? 365 : 150;
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${BINANCE_TF[tf]}&limit=${limit}`;
    const combinedSignal = signal ?? AbortSignal.timeout(8000);
    const res = await fetch(url, { signal: combinedSignal });
    if (!res.ok) return generateFallbackCandles(symbol, tf);
    const data: number[][] = await res.json();
    const candles = data.map(k => ({
      time:   Math.floor(k[0] / 1000),
      open:   parseFloat(k[1] as unknown as string),
      high:   parseFloat(k[2] as unknown as string),
      low:    parseFloat(k[3] as unknown as string),
      close:  parseFloat(k[4] as unknown as string),
      volume: parseFloat(k[5] as unknown as string),
    }));
    candleCache.set(cacheKey, { data: candles, ts: Date.now() });
    return candles;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    return generateFallbackCandles(symbol, tf);
  }
}

// ─── Deterministic Fallback Candle Generator (Guarantees chart is never blank) ─
function getBaselinePrice(symbol: string): number {
  if (symbol.includes('BTC')) return 85000;
  if (symbol.includes('ETH')) return 3400;
  if (symbol.includes('SOL')) return 195;
  if (symbol.includes('AAPL')) return 329;
  if (symbol.includes('TSLA')) return 352;
  if (symbol.includes('NVDA')) return 145;
  if (symbol.includes('CL=')) return 90.2;
  if (symbol.includes('BZ=')) return 93.5;
  if (symbol.includes('GC=')) return 4240;
  if (symbol.includes('SI=')) return 34.5;
  if (symbol.includes('RELIANCE')) return 1187;
  if (symbol.includes('TCS')) return 3850;
  if (symbol.includes('EURUSD')) return 1.136;
  if (symbol.includes('USDINR')) return 86.8;
  if (symbol.includes('DX-Y')) return 104.5;
  if (symbol.includes('SPY') || symbol.includes('VOO')) return 764;
  if (symbol.includes('QQQ')) return 510;
  if (symbol.includes('BIL')) return 91.6;
  if (symbol.includes('^TNX')) return 4.45;
  return 100;
}

export function generateFallbackCandles(symbol: string, tf: Timeframe, count = 80): Candle[] {
  const stepSec = TF_PARAMS[tf].seconds;
  const now = Math.floor(Date.now() / 1000);
  const basePrice = getBaselinePrice(symbol);
  const candles: Candle[] = [];

  let curPrice = basePrice * 0.95;
  let seed = 42;
  const pseudoRand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280 - 0.5;
  };

  const startTime = now - count * stepSec;
  for (let i = 0; i < count; i++) {
    const time = startTime + i * stepSec;
    const change = pseudoRand() * curPrice * 0.012;
    const open = curPrice;
    const close = Math.max(open + change, 0.01);
    const high = Math.max(open, close) + Math.abs(pseudoRand()) * curPrice * 0.008;
    const low = Math.min(open, close) - Math.abs(pseudoRand()) * curPrice * 0.008;
    const volume = Math.floor(Math.abs(pseudoRand()) * 50000 + 10000);

    candles.push({ time, open, high, low, close, volume });
    curPrice = close;
  }
  return candles;
}
