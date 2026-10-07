// ─── Asset Types ──────────────────────────────────────────────────────────

export type AssetClass = 'crypto' | 'stock' | 'commodity' | 'fund' | 'forex' | 'fixed-income';

export type AngelId = 'NIFTY' | 'BANKNIFTY' | 'SENSEX';

export interface Asset {
  symbol: string;       // e.g. 'BTCUSDT', 'AAPL', 'GC=F'
  name: string;
  class: AssetClass;
  quoteSymbol: string;  // symbol used for fetching
  iconLetters: string;  // 2-3 chars shown in circle
  iconColor?: string;
  angelId?: AngelId;   // set when this asset is served by the Angel bridge
}

export type QuoteSource = 'angel' | 'yahoo' | 'binance';

export interface Quote {
  symbol: string;
  price: number;
  change: number;      // absolute change
  changePct: number;   // percentage change
  high24h: number;
  low24h: number;
  volume: number;
  timestamp: number;
  source?: QuoteSource; // where the price came from (default: yahoo)
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '1D';

export interface Candle {
  time: number;   // Unix seconds (lightweight-charts format)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
