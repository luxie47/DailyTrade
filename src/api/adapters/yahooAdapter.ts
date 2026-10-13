import type { Quote, Candle, Timeframe } from '../../types/market';
import { ENV, isCapacitorNative, isLocalDev } from '../../config/env';
import { TIMEFRAME_PARAMS, generateFallbackCandles } from './syntheticAdapter';

function getYahooUrls(path: string): string[] {
  const isCapacitor = isCapacitorNative();
  const rawUrl = `${ENV.YAHOO_BASE_URL}${path}`;

  if (isCapacitor) {
    // In native Android APK, Capacitor native HTTP has zero CORS restrictions
    return [rawUrl, `${ENV.ALLORIGINS_PROXY}${encodeURIComponent(rawUrl)}`];
  }

  if (isLocalDev()) {
    return [`${ENV.DEV_PROXY_PREFIX}${path}`];
  }

  return [`${ENV.ALLORIGINS_PROXY}${encodeURIComponent(rawUrl)}`];
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
  };
}

async function fetchYahooJson(path: string, signal?: AbortSignal): Promise<YahooChartResponse | null> {
  const urls = getYahooUrls(path);
  for (const url of urls) {
    try {
      const fetchSignal = signal ?? AbortSignal.timeout(6000);
      const res = await fetch(url, { signal: fetchSignal });
      if (!res.ok) continue;
      const json = await res.json() as YahooChartResponse;
      if (json?.chart?.result?.[0]) return json;
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') throw e;
    }
  }
  return null;
}

export async function fetchYahooQuote(symbol: string): Promise<Quote | null> {
  const json = await fetchYahooJson(`/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`);
  if (!json) return null;
  const result = json.chart?.result?.[0];
  const meta = result?.meta;
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

export async function fetchBatchYahooQuotes(symbols: string[]): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  if (!symbols.length) return out;

  const BATCH_SIZE = 8;
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const chunk = symbols.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async (s) => {
        try {
          const q = await fetchYahooQuote(s);
          if (q) out[s] = q;
        } catch {
          // ignore individual fail in batch
        }
      })
    );
  }
  return out;
}

const candleCache = new Map<string, { data: Candle[]; ts: number }>();

export async function fetchCandles(symbol: string, tf: Timeframe, signal?: AbortSignal): Promise<Candle[]> {
  const cacheKey = `${symbol}-${tf}`;
  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < ENV.CANDLE_CACHE_TTL_MS) return cached.data;

  try {
    const { interval, range } = TIMEFRAME_PARAMS[tf];
    const json = await fetchYahooJson(`/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`, signal);
    if (!json) return generateFallbackCandles(symbol, tf);

    const result = json?.chart?.result?.[0];
    if (!result) return generateFallbackCandles(symbol, tf);

    const timestamps: number[] = result.timestamp ?? [];
    const ohlcv = result.indicators?.quote?.[0];
    if (!ohlcv || !timestamps.length) return generateFallbackCandles(symbol, tf);

    const validCandles: Candle[] = timestamps.map((t, i) => ({
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
  } catch (e: unknown) {
    if ((e as Error)?.name === 'AbortError') throw e;
    return generateFallbackCandles(symbol, tf);
  }
}
