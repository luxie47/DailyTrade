import { useState, useCallback } from 'react';
import { loadState, saveState, formatCurrency, type AppState } from '../services/storage';
import { triggerAutoBackup } from '../services/backupService';
import type { Currency } from '../types/account';
import type { Position, ClosedTrade, Order } from '../types/trade';
import { formatAssetPrice, getAssetUSDMultiplier } from '../utils/formatPrice';
import { calculateUnrealizedPnL, calculateTotalEquity } from '../core/portfolio/calculations';
import { validateMarketBuy, validateMarketSell, validateLimitOrder, shouldOrderFill } from '../core/trading/orders';

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
    return calculateUnrealizedPnL(positions, prices);
  }, [positions]);

  // ── Account equity (cash + open positions value) ─────────────────────────
  const calcEquity = useCallback((prices: Record<string, number>): number => {
    return calculateTotalEquity(activeAccount.cashUSD, positions, prices);
  }, [positions, activeAccount.cashUSD]);

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

  // ── Market Sell / Close Position ─────────────────────────────────────────
  const closePosition = useCallback((positionId: string, currentPriceUSD: number): void => {
    setState(prev => {
      const pos = prev.positions.find(p => p.id === positionId);
      if (!pos) return prev;

      const mult = getAssetUSDMultiplier(pos.symbol);
      const isShort = pos.side === 'short';
      const pnl = isShort
        ? (pos.entryPriceUSD - currentPriceUSD) * pos.quantity * mult
        : (currentPriceUSD - pos.entryPriceUSD) * pos.quantity * mult;
      const marginCost = pos.entryPriceUSD * pos.quantity * mult;
      const proceeds = isShort ? Math.max(0, marginCost + pnl) : currentPriceUSD * pos.quantity * mult;
      const trade: ClosedTrade = {
        id: crypto.randomUUID(),
        accountId: prev.activeAccountId,
        symbol: pos.symbol,
        side: pos.side ?? 'long',
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

  // ── Market Buy (opens long OR covers existing short) ──────────────────────
  const marketBuy = useCallback((
    symbol: string,
    quantity: number,
    priceUSD: number,
    stopLoss?: number,
    takeProfit?: number
  ): string | null => {
    // If holding an open SHORT position in this symbol, buying acts as Buy-to-Cover (partial or full)
    const existingShort = positions.find(p => p.symbol === symbol && p.side === 'short');
    if (existingShort) {
      const coverQty = Math.min(quantity, existingShort.quantity);
      const mult = getAssetUSDMultiplier(symbol);
      const pnl = (existingShort.entryPriceUSD - priceUSD) * coverQty * mult;
      const marginCost = existingShort.entryPriceUSD * coverQty * mult;
      const proceeds = Math.max(0, marginCost + pnl);
      const isFullClose = coverQty >= existingShort.quantity;

      setState(prev => {
        const trade: ClosedTrade = {
          id: crypto.randomUUID(),
          accountId: prev.activeAccountId,
          symbol: existingShort.symbol,
          side: 'short',
          quantity: coverQty,
          entryPriceUSD: existingShort.entryPriceUSD,
          exitPriceUSD: priceUSD,
          realizedPnLUSD: pnl,
          entryTime: existingShort.entryTime,
          exitTime: Date.now(),
        };
        const isPosOrder = (o: Order) =>
          o.positionId === existingShort.id ||
          (o.symbol === existingShort.symbol && (o.type === 'stop_loss' || o.type === 'take_profit'));

        return {
          ...prev,
          accounts: prev.accounts.map(a =>
            a.id === prev.activeAccountId ? { ...a, cashUSD: a.cashUSD + proceeds } : a
          ),
          positions: isFullClose
            ? prev.positions.filter(p => p.id !== existingShort.id)
            : prev.positions.map(p => p.id === existingShort.id ? { ...p, quantity: p.quantity - coverQty } : p),
          orders: isFullClose ? prev.orders.filter(o => !isPosOrder(o)) : prev.orders,
          history: [trade, ...prev.history].slice(0, 500),
        };
      });

      const acc = state.accounts.find(a => a.id === state.activeAccountId) ?? state.accounts[0];
      onNotify?.(
        pnl >= 0 ? 'Short Covered (Profit)' : 'Short Covered (Loss)',
        `Covered ${coverQty} ${symbol} @ ${formatAssetPrice(priceUSD, symbol)} (${pnl >= 0 ? '+' : ''}${formatCurrency(pnl, acc.currency)})`,
        pnl >= 0 ? 'success' : 'error'
      );
      return null;
    }

    const validation = validateMarketBuy(activeAccount.cashUSD, symbol, quantity, priceUSD);
    if (!validation.valid) return validation.error ?? 'Invalid order';
    const cost = validation.costUSD!;

    setState(prev => {
      const acc = prev.accounts.find(a => a.id === prev.activeAccountId)!;
      const updatedAcc = { ...acc, cashUSD: acc.cashUSD - cost };
      const posId = crypto.randomUUID();
      const newPos: Position = {
        id: posId,
        accountId: prev.activeAccountId,
        symbol,
        side: 'long',
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
  }, [activeAccount, positions, closePosition, setState, onNotify]);

  // ── Market Sell (by symbol — closes or reduces existing long position, or opens short) ──
  const marketSell = useCallback((
    symbol: string,
    quantity: number,
    priceUSD: number,
    stopLoss?: number,
    takeProfit?: number
  ): string | null => {
    const pos = positions.find(p => p.symbol === symbol && (p.side === 'long' || !p.side));
    if (pos) {
      const validation = validateMarketSell(pos, quantity);
      if (!validation.valid) return validation.error ?? 'Invalid order';

      const mult = getAssetUSDMultiplier(symbol);
      const proceeds = priceUSD * quantity * mult;
      const pnl = (priceUSD - pos.entryPriceUSD) * quantity * mult;
      const isFullClose = quantity >= pos.quantity;

      setState(prev => {
        const trade: ClosedTrade = {
          id: crypto.randomUUID(),
          accountId: prev.activeAccountId,
          symbol: pos.symbol,
          side: 'long',
          quantity,
          entryPriceUSD: pos.entryPriceUSD,
          exitPriceUSD: priceUSD,
          realizedPnLUSD: pnl,
          entryTime: pos.entryTime,
          exitTime: Date.now(),
        };
        const isPosOrder = (o: Order) =>
          o.positionId === pos.id ||
          (o.symbol === pos.symbol && (o.type === 'stop_loss' || o.type === 'take_profit'));

        return {
          ...prev,
          accounts: prev.accounts.map(a =>
            a.id === prev.activeAccountId ? { ...a, cashUSD: a.cashUSD + proceeds } : a
          ),
          positions: isFullClose
            ? prev.positions.filter(p => p.id !== pos.id)
            : prev.positions.map(p => p.id === pos.id ? { ...p, quantity: p.quantity - quantity } : p),
          orders: isFullClose ? prev.orders.filter(o => !isPosOrder(o)) : prev.orders,
          history: [trade, ...prev.history].slice(0, 500),
        };
      });

      const acc = state.accounts.find(a => a.id === state.activeAccountId) ?? state.accounts[0];
      onNotify?.(
        pnl >= 0 ? 'Sell Executed (Profit)' : 'Sell Executed (Loss)',
        `Sold ${quantity} ${symbol} @ ${formatAssetPrice(priceUSD, symbol)} (${pnl >= 0 ? '+' : ''}${formatCurrency(pnl, acc.currency)})`,
        pnl >= 0 ? 'success' : 'error'
      );
      return null;
    } else {
      // Direct short order (no position held)
      const validation = validateMarketBuy(activeAccount.cashUSD, symbol, quantity, priceUSD);
      if (!validation.valid) return validation.error ?? 'Invalid order';
      const cost = validation.costUSD!;

      setState(prev => {
        const acc = prev.accounts.find(a => a.id === prev.activeAccountId)!;
        const updatedAcc = { ...acc, cashUSD: acc.cashUSD - cost };
        const posId = crypto.randomUUID();
        const newPos: Position = {
          id: posId,
          accountId: prev.activeAccountId,
          symbol,
          side: 'short',
          quantity,
          entryPriceUSD: priceUSD,
          entryTime: Date.now(),
          stopLoss,
          takeProfit,
        };
        const newOrders: Order[] = [];
        if (stopLoss) newOrders.push({
          id: crypto.randomUUID(), accountId: prev.activeAccountId,
          symbol, side: 'buy', type: 'stop_loss', quantity,
          limitPrice: stopLoss, positionId: posId, status: 'pending', createdAt: Date.now(),
        });
        if (takeProfit) newOrders.push({
          id: crypto.randomUUID(), accountId: prev.activeAccountId,
          symbol, side: 'buy', type: 'take_profit', quantity,
          limitPrice: takeProfit, positionId: posId, status: 'pending', createdAt: Date.now(),
        });
        return {
          ...prev,
          accounts: prev.accounts.map(a => a.id === prev.activeAccountId ? updatedAcc : a),
          positions: [...prev.positions, newPos],
          orders: [...prev.orders, ...newOrders],
        };
      });
      onNotify?.('Short Order Executed', `Short sold ${quantity} ${symbol} @ ${formatAssetPrice(priceUSD, symbol)}`, 'success');
      return null;
    }
  }, [positions, activeAccount.cashUSD, state.accounts, state.activeAccountId, setState, onNotify]);

  // ── Set / Update Stop Loss & Take Profit on Existing Position ──────────────
  const updatePositionSLTP = useCallback((positionId: string, stopLoss?: number, takeProfit?: number) => {
    setState(prev => {
      const pos = prev.positions.find(p => p.id === positionId);
      if (!pos) return prev;

      const exitSide: 'buy' | 'sell' = pos.side === 'short' ? 'buy' : 'sell';

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
          side: exitSide,
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
          side: exitSide,
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
    const validation = validateLimitOrder(activeAccount.cashUSD, side, quantity, limitPrice, symbol);
    if (!validation.valid) return validation.error ?? 'Invalid order';
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

        if (!shouldOrderFill(order, price)) continue;

        // Check if this order is linked to a position (SL/TP) or is an unlinked sell
        const pos = order.positionId
          ? updated.positions.find(p => p.id === order.positionId)
          : (order.side === 'sell'
              ? updated.positions.find(p => p.symbol === order.symbol && p.accountId === order.accountId && (p.side === 'long' || !p.side))
              : null);

        if (pos) {
          // Closing or reducing linked position (long or short)
          const fillQty = Math.min(order.quantity, pos.quantity);
          const mult = getAssetUSDMultiplier(order.symbol);
          const isShort = pos.side === 'short';
          const pnl = isShort
            ? (pos.entryPriceUSD - price) * fillQty * mult
            : (price - pos.entryPriceUSD) * fillQty * mult;
          const marginCost = pos.entryPriceUSD * fillQty * mult;
          const proceeds = isShort ? Math.max(0, marginCost + pnl) : price * fillQty * mult;
          const trade: ClosedTrade = {
            id: crypto.randomUUID(), accountId: order.accountId, symbol: order.symbol,
            side: pos.side ?? 'long',
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
            `${isShort ? 'Covered' : 'Sold'} ${fillQty} ${order.symbol} @ ${formatAssetPrice(price, order.symbol)} (${pnl >= 0 ? '+' : ''}${formatCurrency(pnl, curr)})`,
            notifType
          );
        } else if (order.side === 'buy') {
          // Regular unlinked limit buy order
          const mult = getAssetUSDMultiplier(order.symbol);
          const cost = price * order.quantity * mult;
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
              symbol: order.symbol, side: 'long', quantity: order.quantity,
              entryPriceUSD: price, entryTime: Date.now(),
            }],
            orders: updated.orders.map(o => o.id === order.id ? { ...o, status: 'filled' as const, filledAt: Date.now(), filledPrice: price } : o),
          };
          onNotify?.('Limit Buy Filled', `Bought ${order.quantity} ${order.symbol} @ ${formatAssetPrice(price, order.symbol)}`, 'success');
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
    marketBuy, marketSell, closePosition, placeLimitOrder, cancelOrder, checkLimitOrders,
    updatePositionSLTP,
    createAccount, switchAccount, topUpAccount, resetAccount, deleteAccount, updateAccountCurrency,
    replaceState,
  };
}
