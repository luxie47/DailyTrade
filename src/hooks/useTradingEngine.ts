import { useState, useCallback } from 'react';
import { loadState, saveState, formatCurrency, type AppState } from '../services/storage';
import { triggerAutoBackup } from '../services/backupService';
import type { Currency } from '../types/account';
import type { Position, ClosedTrade, Order } from '../types/trade';
import { formatAssetPrice } from '../utils/formatPrice';

export type NotificationCallback = (title: string, message: string, type: 'success' | 'error' | 'info') => void;

export function useTradingEngine(onNotify?: NotificationCallback) {
  const [state, setStateRaw] = useState<AppState>(loadState);

  // persist on every change & auto-backup to device storage
  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw(prev => {
      const next = updater(prev);
      saveState(next);
      triggerAutoBackup(next);
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
      const posId = crypto.randomUUID();
      const newPos: Position = {
        id: posId,
        accountId: prev.activeAccountId,
        symbol,
        quantity,
        entryPriceUSD: priceUSD,
        entryTime: Date.now(),
        stopLoss,
        takeProfit,
      };
      // Attach SL/TP as pending orders linked to positionId
      const newOrders: Order[] = [];
      if (stopLoss) newOrders.push({
        id: crypto.randomUUID(), accountId: prev.activeAccountId,
        symbol, side: 'sell', type: 'stop_loss', quantity,
        limitPrice: stopLoss, positionId: posId, status: 'pending', createdAt: Date.now(),
      });
      if (takeProfit) newOrders.push({
        id: crypto.randomUUID(), accountId: prev.activeAccountId,
        symbol, side: 'sell', type: 'take_profit', quantity,
        limitPrice: takeProfit, positionId: posId, status: 'pending', createdAt: Date.now(),
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
      // Cancel paired SL/TP pending orders for this position
      const isPosOrder = (o: Order) =>
        o.positionId === positionId ||
        (o.symbol === pos.symbol && (o.type === 'stop_loss' || o.type === 'take_profit'));

      return {
        ...prev,
        accounts: prev.accounts.map(a =>
          a.id === prev.activeAccountId ? { ...acc, cashUSD: acc.cashUSD + proceeds } : a
        ),
        positions: prev.positions.filter(p => p.id !== positionId),
        orders: prev.orders.filter(o => !isPosOrder(o)),
        history: [trade, ...prev.history].slice(0, 500),
      };
    });
  }, [setState, onNotify]);

  // ── Set / Update Stop Loss & Take Profit on Existing Position ──────────────
  const updatePositionSLTP = useCallback((positionId: string, stopLoss?: number, takeProfit?: number) => {
    setState(prev => {
      const pos = prev.positions.find(p => p.id === positionId);
      if (!pos) return prev;

      // Filter out existing SL/TP orders for this position
      const remainingOrders = prev.orders.filter(o =>
        o.positionId !== positionId &&
        !(o.symbol === pos.symbol && o.accountId === pos.accountId && (o.type === 'stop_loss' || o.type === 'take_profit'))
      );
      const newOrders: Order[] = [];
      if (stopLoss && stopLoss > 0) {
        newOrders.push({
          id: crypto.randomUUID(),
          accountId: pos.accountId,
          symbol: pos.symbol,
          side: 'sell',
          type: 'stop_loss',
          quantity: pos.quantity,
          limitPrice: stopLoss,
          positionId,
          status: 'pending',
          createdAt: Date.now(),
        });
      }
      if (takeProfit && takeProfit > 0) {
        newOrders.push({
          id: crypto.randomUUID(),
          accountId: pos.accountId,
          symbol: pos.symbol,
          side: 'sell',
          type: 'take_profit',
          quantity: pos.quantity,
          limitPrice: takeProfit,
          positionId,
          status: 'pending',
          createdAt: Date.now(),
        });
      }
      return {
        ...prev,
        positions: prev.positions.map(p =>
          p.id === positionId ? { ...p, stopLoss, takeProfit } : p
        ),
        orders: [...remainingOrders, ...newOrders],
      };
    });
    onNotify?.('Protection Updated', 'Stop Loss / Target Price set', 'info');
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

  // ── Check pending limit, stop loss, and take profit orders against prices ──
  const checkLimitOrders = useCallback((prices: Record<string, number>) => {
    setState(prev => {
      let updated = { ...prev };
      for (const order of prev.orders.filter(o => o.status === 'pending')) {
        const price = prices[order.symbol];
        if (!price || price <= 0) continue;

        let shouldFill = false;
        if (order.type === 'limit') {
          shouldFill = order.side === 'buy'
            ? price <= (order.limitPrice ?? Infinity)
            : price >= (order.limitPrice ?? 0);
        } else if (order.type === 'take_profit') {
          shouldFill = price >= (order.limitPrice ?? 0);
        } else if (order.type === 'stop_loss') {
          shouldFill = price <= (order.limitPrice ?? Infinity);
        }
        if (!shouldFill) continue;

        // Fill buy order
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
          // Sell order: find matching position (by linked positionId first)
          const pos = order.positionId
            ? updated.positions.find(p => p.id === order.positionId)
            : updated.positions.find(p => p.symbol === order.symbol && p.accountId === order.accountId);
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
            // Cancel sibling SL/TP paired to this position if position fully closed
            orders: updated.orders.map(o => {
              if (o.id === order.id) {
                return { ...o, status: 'filled' as const, filledAt: Date.now(), filledPrice: price };
              }
              if (pos.quantity <= fillQty && o.status === 'pending') {
                if (order.positionId && o.positionId === order.positionId) {
                  return { ...o, status: 'cancelled' as const };
                }
                if (!order.positionId && o.symbol === order.symbol && o.accountId === order.accountId && (o.type === 'stop_loss' || o.type === 'take_profit')) {
                  return { ...o, status: 'cancelled' as const };
                }
              }
              return o;
            }),
          };

          let notifTitle = 'Limit Sell Filled';
          let notifType: 'success' | 'error' | 'info' = pnl >= 0 ? 'success' : 'error';
          if (order.type === 'stop_loss') {
            notifTitle = '🛑 Stop Loss Triggered';
            notifType = 'error';
          } else if (order.type === 'take_profit') {
            notifTitle = '🎯 Target Reached (Take Profit)';
            notifType = 'success';
          }

          onNotify?.(
            notifTitle,
            `Sold ${fillQty} ${order.symbol} @ ${formatAssetPrice(price, order.symbol)} (${pnl >= 0 ? '+' : ''}${formatCurrency(pnl, curr)})`,
            notifType
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

  const replaceState = useCallback((newState: AppState) => {
    setState(() => newState);
  }, [setState]);

  return {
    state, activeAccount, positions, orders, history,
    calcUnrealisedPnL, calcEquity, recordEquity,
    marketBuy, closePosition, placeLimitOrder, cancelOrder, checkLimitOrders,
    updatePositionSLTP,
    createAccount, switchAccount, topUpAccount, resetAccount, deleteAccount, updateAccountCurrency,
    replaceState,
  };
}
