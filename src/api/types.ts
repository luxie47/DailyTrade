import type { Quote, Candle, Timeframe } from '../types/market';

export type QuoteCallback = (quote: Quote) => void;
export type PriceCallback = (price: number) => void;
export type Unsubscribe = () => void;

export interface MarketDataProvider {
  fetchCandles(symbol: string, timeframe: Timeframe, signal?: AbortSignal): Promise<Candle[]>;
  fetchQuote(symbol: string): Promise<Quote | null>;
  subscribeQuote?(symbol: string, callback: QuoteCallback): Unsubscribe;
}
