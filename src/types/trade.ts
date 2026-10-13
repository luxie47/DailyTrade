// ─── Order & Position Types ────────────────────────────────────────────────

export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'filled' | 'pending' | 'cancelled';

export interface Order {
  id: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;        // number of units
  limitPrice?: number;     // USD — set for limit orders, SL, TP
  stopLoss?: number;       // USD
  takeProfit?: number;     // USD
  positionId?: string;     // Linked position for SL/TP OCO pairs
  filledPrice?: number;    // USD — set on execution
  status: OrderStatus;
  createdAt: number;
  filledAt?: number;
}

export interface Position {
  id: string;
  accountId: string;
  symbol: string;
  side?: 'long' | 'short'; // Defaults to 'long'
  quantity: number;
  entryPriceUSD: number;
  entryTime: number;
  stopLoss?: number;       // Attached Stop Loss price
  takeProfit?: number;     // Attached Take Profit price
}

export interface ClosedTrade {
  id: string;
  accountId: string;
  symbol: string;
  side?: 'long' | 'short';
  quantity: number;
  entryPriceUSD: number;
  exitPriceUSD: number;
  realizedPnLUSD: number;
  entryTime: number;
  exitTime: number;
}
