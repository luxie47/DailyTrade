import type { Candle, Timeframe } from '../../types/market';
import { TIMERS } from '../../config/constants';

export const TIMEFRAME_PARAMS: Record<Timeframe, { interval: string; range: string; seconds: number }> = {
  '1m':  { interval: '1m',  range: '1d',  seconds: 60 },
  '5m':  { interval: '5m',  range: '5d',  seconds: 300 },
  '15m': { interval: '15m', range: '5d',  seconds: 900 },
  '1h':  { interval: '60m', range: '1mo', seconds: 3600 },
  '1D':  { interval: '1d',  range: '1y',  seconds: 86400 },
};

const syntheticPrices = new Map<string, number>();

export function gbmTick(price: number): number {
  const sigma = 0.0004; // realistic live volatility
  const shock = (Math.random() - 0.498) * 2 * sigma;
  return Math.max(price * (1 + shock), 0.00001);
}

export function startSyntheticTicks(
  symbol: string,
  seedPrice: number,
  callback: (price: number) => void,
  intervalMs = TIMERS.SYNTHETIC_TICK_MS
): () => void {
  syntheticPrices.set(symbol, seedPrice);
  const intervalId = setInterval(() => {
    const prev = syntheticPrices.get(symbol) ?? seedPrice;
    const next = gbmTick(prev);
    syntheticPrices.set(symbol, next);
    callback(next);
  }, intervalMs);
  return () => clearInterval(intervalId);
}

export function getBaselinePrice(symbol: string): number {
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
  if (symbol.includes('^NSEI')) return 25000;
  if (symbol.includes('^BSESN')) return 82000;
  if (symbol.includes('^NSEBANK')) return 51000;
  return 100;
}

export function generateFallbackCandles(symbol: string, tf: Timeframe, count = 80): Candle[] {
  const stepSec = TIMEFRAME_PARAMS[tf].seconds;
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
