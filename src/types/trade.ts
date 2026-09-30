// ─── Order & Position Types ────────────────────────────────────────────────

export type OrderType = 'market' | 'limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'filled' | 'pending' | 'cancelled';

export interface Order {
  id: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;        // number of units
  limitPrice?: number;     // USD — set for limit orders
  stopLoss?: number;       // USD
  takeProfit?: number;     // USD
  filledPrice?: number;    // USD — set on execution
  status: OrderStatus;
  createdAt: number;
  filledAt?: number;
}

export interface Position {
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  entryPriceUSD: number;
  entryTime: number;
}

export interface ClosedTrade {
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  entryPriceUSD: number;
  exitPriceUSD: number;
  realizedPnLUSD: number;
  entryTime: number;
  exitTime: number;
}
