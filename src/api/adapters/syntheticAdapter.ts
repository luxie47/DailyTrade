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

export function gbmTick(price: number, anchorPrice?: number): number {
  const sigma = 0.00006; // calm, realistic volatility
  let drift = 0;
  if (anchorPrice && anchorPrice > 0) {
    // Mean reversion to anchor real price
    drift = (anchorPrice - price) * 0.05;
  }
  const shock = (Math.random() - 0.5) * 2 * sigma * price;
  return Math.max(price + drift + shock, 0.00001);
}

export function startSyntheticTicks(
  symbol: string,
  seedPrice: number,
  callback: (price: number) => void,
  intervalMs: number = TIMERS.SYNTHETIC_TICK_MS
): () => void {
  syntheticPrices.set(symbol, seedPrice);
  const intervalId = setInterval(() => {
    const prev = syntheticPrices.get(symbol) ?? seedPrice;
    const next = gbmTick(prev, seedPrice);
    syntheticPrices.set(symbol, next);
    callback(next);
  }, intervalMs);
  return () => clearInterval(intervalId);
}

export function getBaselinePrice(symbol: string): number {
  if (symbol.includes('BTC')) return 81700;
  if (symbol.includes('ETH')) return 2600;
  if (symbol.includes('SOL')) return 165;
  if (symbol.includes('AAPL')) return 329;
  if (symbol.includes('TSLA')) return 352;
  if (symbol.includes('NVDA')) return 145;
  if (symbol.includes('CL=')) return 90.2;
  if (symbol.includes('BZ=')) return 93.5;
  if (symbol.includes('GC=') || symbol.includes('XAU')) return 2650;
  if (symbol.includes('SI=')) return 34.5;
  if (symbol.includes('RELIANCE')) return 1187;
  if (symbol.includes('JIOPLAT')) return 1119;
  if (symbol.includes('JIOFIN')) return 320;
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
  if (symbol.includes('DIXON')) return 14500;
  if (symbol.includes('POLYCAB')) return 6800;
  if (symbol.includes('PERSISTENT')) return 5400;
  if (symbol.includes('RVNL')) return 420;
  if (symbol.includes('NHPC')) return 85;
  if (symbol.includes('IBIT')) return 48;
  if (symbol.includes('RDDT')) return 115;
  if (symbol.includes('BABA')) return 110;
  if (symbol.includes('VT')) return 120;
  if (symbol.includes('JEPI')) return 58;
  if (symbol.includes('GDX')) return 38;
  if (symbol.includes('LIT')) return 45;
  if (symbol.includes('DBA')) return 24;
  if (symbol.includes('SQQQ')) return 9;
  return 100;
}

export function generateFallbackCandles(symbol: string, tf: Timeframe, count = 80): Candle[] {
  const stepSec = TIMEFRAME_PARAMS[tf].seconds;
  const now = Math.floor(Date.now() / 1000);
  const snappedNow = Math.floor(now / stepSec) * stepSec;
  const basePrice = getBaselinePrice(symbol);
  const candles: Candle[] = [];

  let seed = 42;
  const pseudoRand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280 - 0.5;
  };

  // Generate walk backwards from basePrice so the last candle's close matches basePrice exactly
  const closes: number[] = new Array(count);
  closes[count - 1] = basePrice;
  for (let i = count - 2; i >= 0; i--) {
    const change = pseudoRand() * closes[i + 1] * 0.003;
    closes[i] = Math.max(closes[i + 1] - change, 0.01);
  }

  const startTime = snappedNow - (count - 1) * stepSec;
  for (let i = 0; i < count; i++) {
    const time = startTime + i * stepSec;
    const open = i === 0 ? closes[0] * (1 - pseudoRand() * 0.002) : closes[i - 1];
    const close = closes[i];
    const high = Math.max(open, close) + Math.abs(pseudoRand()) * close * 0.002;
    const low = Math.min(open, close) - Math.abs(pseudoRand()) * close * 0.002;
    const volume = Math.floor(Math.abs(pseudoRand()) * 50000 + 10000);

    candles.push({ time, open, high, low, close, volume });
  }
  return candles;
}
