import type { Quote, Candle, Timeframe } from '../types/market';
import { BINANCE_SYMBOLS } from '../data/assets';

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

async function fetchYahooJson(path: string): Promise<any> {
  const urls = getYahooUrls(path);
  for (const u of urls) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const json = await res.json();
      if (json?.chart?.result?.[0]) return json;
    } catch {
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

  return {
    symbol,
    price,
    change,
    changePct,
    high24h: meta.regularMarketDayHigh ?? price,
    low24h:  meta.regularMarketDayLow  ?? price,
    volume:  meta.regularMarketVolume  ?? 0,
    timestamp: Date.now(),
  };
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

// ─── Historical Candles ───────────────────────────────────────────────────────
export async function fetchCandles(symbol: string, tf: Timeframe): Promise<Candle[]> {
  try {
    const { interval, range } = TF_PARAMS[tf];
    const json = await fetchYahooJson(`/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`);
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

    return validCandles.length > 5 ? validCandles : generateFallbackCandles(symbol, tf);
  } catch {
    return generateFallbackCandles(symbol, tf);
  }
}

// ─── Binance Historical Candles (Crypto) ──────────────────────────────────────
const BINANCE_TF: Record<Timeframe, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '1D': '1d'
};

export async function fetchBinanceCandles(symbol: string, tf: Timeframe): Promise<Candle[]> {
  try {
    const limit = tf === '1D' ? 365 : 150;
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${BINANCE_TF[tf]}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return generateFallbackCandles(symbol, tf);
    const data: number[][] = await res.json();
    return data.map(k => ({
      time:   Math.floor(k[0] / 1000),
      open:   parseFloat(k[1] as unknown as string),
      high:   parseFloat(k[2] as unknown as string),
      low:    parseFloat(k[3] as unknown as string),
      close:  parseFloat(k[4] as unknown as string),
      volume: parseFloat(k[5] as unknown as string),
    }));
  } catch {
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
