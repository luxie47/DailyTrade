import { useState, useCallback } from 'react';
import { loadState, saveState, formatCurrency, type AppState } from '../services/storage';
import type { Currency } from '../types/account';
import type { Position, ClosedTrade, Order } from '../types/trade';
import { formatAssetPrice } from '../utils/formatPrice';

export type NotificationCallback = (title: string, message: string, type: 'success' | 'error' | 'info') => void;

export function useTradingEngine(onNotify?: NotificationCallback) {
  const [state, setStateRaw] = useState<AppState>(loadState);

  // persist on every change
  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw(prev => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  // ── Derived active account ───────────────────────────────────────────────
  const activeAccount = state.accounts.find(a => a.id === state.activeAccountId) ?? state.accounts[0];

  // ── Positions / Orders for active account ────────────────────────────────
  const positions = state.positions.filter(p => p.accountId === state.activeAccountId);
  const orders    = state.orders.filter(o => o.accountId === state.activeAccountId && o.status === 'pending');
  const history   = state.history.filter(h => h.accountId === state.activeAccountId);

  // ── Unrealised P&L given current prices map ──────────────────────────────
  const calcUnrealisedPnL = useCallback((prices: Record<string, number>): number => {
    return positions.reduce((sum, pos) => {
      const cur = prices[pos.symbol] ?? pos.entryPriceUSD;
      return sum + (cur - pos.entryPriceUSD) * pos.quantity;
    }, 0);
  }, [positions]);

  // ── Account equity (cash + open positions value) ─────────────────────────
  const calcEquity = useCallback((prices: Record<string, number>): number => {
    const positionValue = positions.reduce((sum, pos) => {
      const cur = prices[pos.symbol] ?? pos.entryPriceUSD;
      return sum + cur * pos.quantity;
    }, 0);
    return activeAccount.cashUSD + positionValue;
  }, [positions, activeAccount]);

  // ─── Record equity snapshot (called periodically) ────────────────────────
  const recordEquity = useCallback((prices: Record<string, number>) => {
    const value = calcEquity(prices);
    setState(prev => {
      const accId = prev.activeAccountId;
      const existing = prev.equityHistory[accId] ?? [];
      return {
        ...prev,
        equityHistory: {
          ...prev.equityHistory,
          [accId]: [...existing.slice(-500), { time: Math.floor(Date.now() / 1000), value }],
        },
      };
    });
  }, [calcEquity, setState]);

  // ── Market Buy ────────────────────────────────────────────────────────────
  const marketBuy = useCallback((
    symbol: string,
    quantity: number,
    priceUSD: number,
    stopLoss?: number,
    takeProfit?: number
  ): string | null => {
    const cost = priceUSD * quantity;
    if (cost > activeAccount.cashUSD) return 'Insufficient cash';
    if (quantity <= 0) return 'Invalid quantity';

    setState(prev => {
      const acc = prev.accounts.find(a => a.id === prev.activeAccountId)!;
      const updatedAcc = { ...acc, cashUSD: acc.cashUSD - cost };
      const newPos: Position = {
        id: crypto.randomUUID(),
        accountId: prev.activeAccountId,
        symbol,
        quantity,
        entryPriceUSD: priceUSD,
        entryTime: Date.now(),
      };
      // Attach SL/TP as pending orders if given
      const newOrders: Order[] = [];
      if (stopLoss) newOrders.push({
        id: crypto.randomUUID(), accountId: prev.activeAccountId,
        symbol, side: 'sell', type: 'limit', quantity,
        limitPrice: stopLoss, status: 'pending', createdAt: Date.now(),
      });
      if (takeProfit) newOrders.push({
        id: crypto.randomUUID(), accountId: prev.activeAccountId,
        symbol, side: 'sell', type: 'limit', quantity,
        limitPrice: takeProfit, status: 'pending', createdAt: Date.now(),
      });
      return {
        ...prev,
        accounts: prev.accounts.map(a => a.id === prev.activeAccountId ? updatedAcc : a),
        positions: [...prev.positions, newPos],
        orders: [...prev.orders, ...newOrders],
      };
    });
    onNotify?.('Order Executed', `Bought ${quantity} ${symbol} @ ${formatAssetPrice(priceUSD, symbol)}`, 'success');
    return null;
  }, [activeAccount, setState, onNotify]);

  // ── Market Sell / Close Position ─────────────────────────────────────────
  const closePosition = useCallback((positionId: string, currentPriceUSD: number): void => {
    setState(prev => {
      const pos = prev.positions.find(p => p.id === positionId);
      if (!pos) return prev;

      const proceeds = currentPriceUSD * pos.quantity;
      const pnl = (currentPriceUSD - pos.entryPriceUSD) * pos.quantity;
      const trade: ClosedTrade = {
        id: crypto.randomUUID(),
        accountId: prev.activeAccountId,
        symbol: pos.symbol,
        quantity: pos.quantity,
        entryPriceUSD: pos.entryPriceUSD,
        exitPriceUSD: currentPriceUSD,
        realizedPnLUSD: pnl,
        entryTime: pos.entryTime,
        exitTime: Date.now(),
      };
      const acc = prev.accounts.find(a => a.id === prev.activeAccountId) ?? prev.accounts[0];
      onNotify?.(
        pnl >= 0 ? 'Profitable Trade Closed' : 'Trade Closed',
        `${pos.symbol}: ${pnl >= 0 ? '+' : ''}${formatCurrency(pnl, acc.currency)}`,
        pnl >= 0 ? 'success' : 'error'
      );
      return {
        ...prev,
        accounts: prev.accounts.map(a =>
          a.id === prev.activeAccountId ? { ...acc, cashUSD: acc.cashUSD + proceeds } : a
        ),
        positions: prev.positions.filter(p => p.id !== positionId),
        orders: prev.orders.filter(o => o.symbol !== pos.symbol),
        history: [trade, ...prev.history].slice(0, 500),
      };
    });
  }, [setState, onNotify]);

  // ── Limit Order ───────────────────────────────────────────────────────────
  const placeLimitOrder = useCallback((
    symbol: string, side: 'buy' | 'sell', quantity: number, limitPrice: number
  ): string | null => {
    if (side === 'buy') {
      const cost = limitPrice * quantity;
      if (cost > activeAccount.cashUSD) return 'Insufficient cash';
    }
    setState(prev => ({
      ...prev,
      orders: [...prev.orders, {
        id: crypto.randomUUID(),
        accountId: prev.activeAccountId,
        symbol, side, type: 'limit', quantity, limitPrice,
        status: 'pending', createdAt: Date.now(),
      }],
    }));
    onNotify?.('Limit Order Placed', `${side.toUpperCase()} ${quantity} ${symbol} @ ${formatAssetPrice(limitPrice, symbol)}`, 'info');
    return null;
  }, [activeAccount, setState, onNotify]);

  // ── Cancel Order ─────────────────────────────────────────────────────────
  const cancelOrder = useCallback((orderId: string) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.filter(o => o.id !== orderId),
    }));
    onNotify?.('Order Cancelled', 'Pending order was cancelled', 'info');
  }, [setState, onNotify]);

  // ── Check pending limit orders against current prices ────────────────────
  const checkLimitOrders = useCallback((prices: Record<string, number>) => {
    setState(prev => {
      let updated = { ...prev };
      for (const order of prev.orders.filter(o => o.status === 'pending' && o.type === 'limit')) {
        const price = prices[order.symbol];
        if (!price) continue;
        const shouldFill = order.side === 'buy'
          ? price <= (order.limitPrice ?? Infinity)
          : price >= (order.limitPrice ?? 0);
        if (!shouldFill) continue;
        // fill it
        if (order.side === 'buy') {
          const cost = price * order.quantity;
          const acc = updated.accounts.find(a => a.id === order.accountId);
          if (!acc || acc.cashUSD < cost) {
            updated = { ...updated, orders: updated.orders.map(o => o.id === order.id ? { ...o, status: 'cancelled' as const } : o) };
            continue;
          }
          updated = {
            ...updated,
            accounts: updated.accounts.map(a => a.id === order.accountId ? { ...a, cashUSD: a.cashUSD - cost } : a),
            positions: [...updated.positions, {
              id: crypto.randomUUID(), accountId: order.accountId,
              symbol: order.symbol, quantity: order.quantity,
              entryPriceUSD: price, entryTime: Date.now(),
            }],
            orders: updated.orders.map(o => o.id === order.id ? { ...o, status: 'filled' as const, filledAt: Date.now(), filledPrice: price } : o),
          };
          onNotify?.('Limit Buy Filled', `Bought ${order.quantity} ${order.symbol} @ ${formatAssetPrice(price, order.symbol)}`, 'success');
        } else {
          // sell — find matching position
          const pos = updated.positions.find(p => p.symbol === order.symbol && p.accountId === order.accountId);
          if (!pos) continue;
          const fillQty = Math.min(order.quantity, pos.quantity);
          const proceeds = price * fillQty;
          const pnl = (price - pos.entryPriceUSD) * fillQty;
          const trade: ClosedTrade = {
            id: crypto.randomUUID(), accountId: order.accountId, symbol: order.symbol,
            quantity: fillQty, entryPriceUSD: pos.entryPriceUSD, exitPriceUSD: price,
            realizedPnLUSD: pnl, entryTime: pos.entryTime, exitTime: Date.now(),
          };
          const accObj = updated.accounts.find(a => a.id === order.accountId);
          const curr = accObj ? accObj.currency : 'USD';

          updated = {
            ...updated,
            accounts: updated.accounts.map(a => a.id === order.accountId ? { ...a, cashUSD: a.cashUSD + proceeds } : a),
            positions: pos.quantity <= fillQty
              ? updated.positions.filter(p => p.id !== pos.id)
              : updated.positions.map(p => p.id === pos.id ? { ...p, quantity: p.quantity - fillQty } : p),
            history: [trade, ...updated.history].slice(0, 500),
            // Cancel other pending orders for this closed position (OCO)
            orders: updated.orders.map(o => {
              if (o.id === order.id) return { ...o, status: 'filled' as const, filledAt: Date.now(), filledPrice: price };
              if (pos.quantity <= fillQty && o.symbol === order.symbol && o.accountId === order.accountId && o.status === 'pending') {
                return { ...o, status: 'cancelled' as const };
              }
              return o;
            }),
          };
          onNotify?.(
            pnl >= 0 ? 'Target Reached (Profit)' : 'Stop Loss Triggered',
            `Sold ${fillQty} ${order.symbol} @ ${formatAssetPrice(price, order.symbol)} (${pnl >= 0 ? '+' : ''}${formatCurrency(pnl, curr)})`,
            pnl >= 0 ? 'success' : 'error'
          );
        }
      }
      return updated;
    });
  }, [setState, onNotify]);

  // ── Account management ────────────────────────────────────────────────────
  const createAccount = useCallback((name: string, currency: Currency, startingCashUSD: number) => {
    const id = crypto.randomUUID();
    setState(prev => ({
      ...prev,
      accounts: [...prev.accounts, {
        id, name, currency, cashUSD: startingCashUSD, startingCashUSD, createdAt: Date.now(),
      }],
      activeAccountId: id,
      equityHistory: {
        ...prev.equityHistory,
        [id]: [{ time: Math.floor(Date.now() / 1000), value: startingCashUSD }],
      },
    }));
  }, [setState]);

  const switchAccount = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeAccountId: id }));
  }, [setState]);

  const topUpAccount = useCallback((amountUSD: number) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map(a =>
        a.id === prev.activeAccountId ? { ...a, cashUSD: a.cashUSD + amountUSD } : a
      ),
    }));
    onNotify?.('Funds Deposited', `Added $${amountUSD.toLocaleString()} paper cash`, 'info');
  }, [setState, onNotify]);

  const resetAccount = useCallback((newStartingCashUSD: number) => {
    setState(prev => {
      const accId = prev.activeAccountId;
      return {
        ...prev,
        accounts: prev.accounts.map(a =>
          a.id === accId ? { ...a, cashUSD: newStartingCashUSD, startingCashUSD: newStartingCashUSD } : a
        ),
        positions: prev.positions.filter(p => p.accountId !== accId),
        orders:    prev.orders.filter(o => o.accountId !== accId),
        history:   prev.history.filter(h => h.accountId !== accId),
        equityHistory: {
          ...prev.equityHistory,
          [accId]: [{ time: Math.floor(Date.now() / 1000), value: newStartingCashUSD }],
        },
      };
    });
  }, [setState]);

  const deleteAccount = useCallback((id: string) => {
    setState(prev => {
      const remaining = prev.accounts.filter(a => a.id !== id);
      if (!remaining.length) return prev; // never delete last account
      return {
        ...prev,
        accounts: remaining,
        activeAccountId: remaining[0].id,
      };
    });
  }, [setState]);

  const updateAccountCurrency = useCallback((currency: Currency) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map(a =>
        a.id === prev.activeAccountId ? { ...a, currency } : a
      ),
    }));
  }, [setState]);

  return {
    state, activeAccount, positions, orders, history,
    calcUnrealisedPnL, calcEquity, recordEquity,
    marketBuy, closePosition, placeLimitOrder, cancelOrder, checkLimitOrders,
    createAccount, switchAccount, topUpAccount, resetAccount, deleteAccount, updateAccountCurrency,
  };
}
