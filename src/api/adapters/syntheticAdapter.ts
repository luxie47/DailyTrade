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
  const s = symbol.toUpperCase();
  // Crypto
  if (s.includes('BTC')) return 81700;
  if (s.includes('ETH')) return 2600;
  if (s.includes('SOL')) return 165;
  if (s.includes('BNB')) return 580;
  if (s.includes('XRP')) return 0.55;
  if (s.includes('DOGE')) return 0.14;
  if (s.includes('ADA')) return 0.35;
  if (s.includes('AVAX')) return 28.5;
  if (s.includes('LINK')) return 11.8;
  if (s.includes('SUI')) return 1.95;
  if (s.includes('NEAR')) return 4.8;

  // Commodities & Metals (Gold updated to current market levels ~4015 USD/oz)
  if (s.includes('GC=') || s.includes('XAU') || s.includes('GOLD')) return 4015;
  if (s.includes('SI=') || s.includes('XAG') || s.includes('SILVER')) return 34.5;
  if (s.includes('CL=')) return 82.5; // Crude Oil WTI
  if (s.includes('BZ=')) return 86.2; // Brent Crude
  if (s.includes('NG=')) return 2.65; // Natural Gas
  if (s.includes('HG=')) return 4.35; // Copper
  if (s.includes('PL=')) return 980; // Platinum
  if (s.includes('PA=')) return 1020; // Palladium

  // Forex
  if (s.includes('USDINR')) return 86.8;
  if (s.includes('EURUSD')) return 1.085;
  if (s.includes('GBPUSD')) return 1.298;
  if (s.includes('USDJPY')) return 152.4;
  if (s.includes('AUDUSD')) return 0.665;
  if (s.includes('USDCAD')) return 1.385;
  if (s.includes('DX-Y')) return 104.5;

  // Indian Stocks (NSE .NS / BSE .BO) - Real Market Values
  if (s.includes('RELIANCE')) return 1190;
  if (s.includes('TCS')) return 3850;
  if (s.includes('HDFCBANK')) return 1680;
  if (s.includes('ICICIBANK')) return 1260;
  if (s.includes('INFY')) return 1845;
  if (s.includes('BHARTIARTL')) return 1680;
  if (s.includes('SBIN')) return 815;
  if (s.includes('LICI')) return 960;
  if (s.includes('ITC')) return 485;
  if (s.includes('HINDUNILVR')) return 2450;
  if (s.includes('LT') && !s.includes('LTC')) return 3550;
  if (s.includes('BAJFINANCE')) return 6950;
  if (s.includes('BAJAJFINSV')) return 1750;
  if (s.includes('MARUTI')) return 12200;
  if (s.includes('TATAMOTORS') || s.includes('TMPV')) return 890;
  if (s.includes('TATASTEEL')) return 152;
  if (s.includes('TITAN')) return 3420;
  if (s.includes('KOTAKBANK')) return 1780;
  if (s.includes('AXISBANK')) return 1180;
  if (s.includes('SUNPHARMA')) return 1880;
  if (s.includes('CIPLA')) return 1540;
  if (s.includes('DRREDDY')) return 1270;
  if (s.includes('ADANIENT')) return 2850;
  if (s.includes('ADANIPORTS')) return 1390;
  if (s.includes('WIPRO')) return 540;
  if (s.includes('HCLTECH')) return 1820;
  if (s.includes('TECHM')) return 1680;
  if (s.includes('NTPC')) return 415;
  if (s.includes('POWERGRID')) return 325;
  if (s.includes('COALINDIA')) return 465;
  if (s.includes('ONGC')) return 275;
  if (s.includes('BPCL')) return 315;
  if (s.includes('ULTRACEMCO')) return 11100;
  if (s.includes('GRASIM')) return 2650;
  if (s.includes('ASIANPAINT')) return 2380;
  if (s.includes('BRITANNIA')) return 5250;
  if (s.includes('NESTLEIND')) return 2340;
  if (s.includes('JSWSTEEL')) return 980;
  if (s.includes('HINDALCO')) return 690;
  if (s.includes('EICHERMOT')) return 4850;
  if (s.includes('M&M') || s.includes('MM.')) return 2890;
  if (s.includes('HEROMOTOCO')) return 5150;
  if (s.includes('DIXON')) return 14500;
  if (s.includes('POLYCAB')) return 6800;
  if (s.includes('PERSISTENT')) return 5400;
  if (s.includes('RVNL')) return 420;
  if (s.includes('NHPC')) return 85;
  if (s.includes('IRFC')) return 148;
  if (s.includes('BHEL')) return 235;
  if (s.includes('BEL')) return 285;
  if (s.includes('HAL')) return 4350;
  if (s.includes('TRENT')) return 7150;
  if (s.includes('ZOMATO')) return 260;
  if (s.includes('JIOFIN')) return 320;
  if (s.includes('JIOPLAT')) return 1119;
  if (s.includes('NIFTYBEES')) return 265;
  if (s.includes('BANKBEES')) return 545;
  if (s.includes('GOLDBEES')) return 72;
  if (s.includes('SILVERBEES')) return 94;
  if (s.includes('LIQUIDBEES')) return 1000;

  // Indian Indices
  if (s.includes('^NSEI')) return 25000;
  if (s.includes('^BSESN')) return 82000;
  if (s.includes('^NSEBANK')) return 51000;

  // US Stocks & ETFs
  if (s.includes('AAPL')) return 348;
  if (s.includes('TSLA')) return 352;
  if (s.includes('NVDA')) return 145;
  if (s.includes('MSFT')) return 430;
  if (s.includes('GOOG') || s.includes('GOOGL')) return 168;
  if (s.includes('AMZN')) return 188;
  if (s.includes('META')) return 590;
  if (s.includes('SPY') || s.includes('VOO')) return 585;
  if (s.includes('QQQ')) return 510;
  if (s.includes('BIL')) return 91.6;
  if (s.includes('^TNX')) return 4.45;
  if (s.includes('IBIT')) return 48;
  if (s.includes('RDDT')) return 115;
  if (s.includes('BABA')) return 110;
  if (s.includes('VT')) return 120;
  if (s.includes('JEPI')) return 58;
  if (s.includes('GDX')) return 38;
  if (s.includes('LIT')) return 45;
  if (s.includes('DBA')) return 24;
  if (s.includes('SQQQ')) return 9;

  // If Indian stock without explicit mapping, realistic mid-cap average
  if (s.endsWith('.NS') || s.endsWith('.BO')) return 1250;

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
