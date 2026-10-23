import { createContext, useContext, type ReactNode } from 'react';
import { useTradingEngine, type NotificationCallback } from '../hooks/useTradingEngine';
import type { AppState } from '../services/storage';
import type { Account, Currency } from '../types/account';
import type { Position, Order, ClosedTrade } from '../types/trade';

interface TradingContextValue {
  state: AppState;
  activeAccount: Account;
  positions: Position[];
  orders: Order[];
  history: ClosedTrade[];
  calcEquity: (prices: Record<string, number>) => number;
  calcUnrealisedPnL: (prices: Record<string, number>) => number;
  recordEquity: (prices: Record<string, number>) => void;
  marketBuy: (symbol: string, quantity: number, priceUSD: number, stopLoss?: number, takeProfit?: number) => string | null;
  marketSell: (symbol: string, quantity: number, priceUSD: number, stopLoss?: number, takeProfit?: number) => string | null;
  closePosition: (positionId: string, currentPriceUSD: number) => void;
  updatePositionSLTP: (positionId: string, stopLoss?: number, takeProfit?: number) => void;
  placeLimitOrder: (symbol: string, side: 'buy' | 'sell', quantity: number, limitPrice: number) => string | null;
  cancelOrder: (orderId: string) => void;
  updateLimitOrderPrice: (orderId: string, newPrice: number) => void;
  checkLimitOrders: (prices: Record<string, number>) => void;
  switchAccount: (id: string) => void;
  createAccount: (name: string, currency: Currency, startingCash: number) => void;
  topUpAccount: (amountUSD: number) => void;
  resetAccount: (startingCashUSD: number) => void;
  deleteAccount: (id: string) => void;
  updateAccountCurrency: (currency: Currency) => void;
  replaceState: (newState: AppState) => void;
}

const TradingContext = createContext<TradingContextValue | null>(null);

interface Props {
  children: ReactNode;
  onNotify?: NotificationCallback;
}

export function TradingProvider({ children, onNotify }: Props) {
  const engine = useTradingEngine(onNotify);

  return (
    <TradingContext.Provider value={engine}>
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading(): TradingContextValue {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
}
