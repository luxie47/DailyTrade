import type { Position, ClosedTrade } from '../../types/trade';
import { getAssetUSDMultiplier } from '../../utils/formatPrice';

export interface PortfolioStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  netPnLUSD: number;
  grossProfitUSD: number;
  grossLossUSD: number;
  profitFactor: number;
}

/**
 * Calculates unrealized PnL for a single position in USD.
 */
export function calculatePositionPnL(position: Position, currentPriceUSD: number): number {
  const multiplier = getAssetUSDMultiplier(position.symbol);
  const diff = position.side === 'short'
    ? position.entryPriceUSD - currentPriceUSD
    : currentPriceUSD - position.entryPriceUSD;
  return diff * position.quantity * multiplier;
}

/**
 * Calculates unrealized PnL percentage for a position.
 */
export function calculatePositionPnLPct(position: Position, currentPriceUSD: number): number {
  if (position.entryPriceUSD <= 0) return 0;
  const diff = position.side === 'short'
    ? position.entryPriceUSD - currentPriceUSD
    : currentPriceUSD - position.entryPriceUSD;
  return (diff / position.entryPriceUSD) * 100;
}

/**
 * Calculates market value of a position in USD.
 */
export function calculatePositionValue(position: Position, currentPriceUSD: number): number {
  const multiplier = getAssetUSDMultiplier(position.symbol);
  if (position.side === 'short') {
    const margin = position.entryPriceUSD * position.quantity * multiplier;
    const pnl = calculatePositionPnL(position, currentPriceUSD);
    return Math.max(0, margin + pnl);
  }
  return currentPriceUSD * position.quantity * multiplier;
}

/**
 * Calculates total unrealized PnL across all open positions.
 */
export function calculateUnrealizedPnL(
  positions: Position[],
  prices: Record<string, number>
): number {
  return positions.reduce((total, pos) => {
    const currentPrice = prices[pos.symbol] ?? pos.entryPriceUSD;
    return total + calculatePositionPnL(pos, currentPrice);
  }, 0);
}

/**
 * Calculates total account equity (cash + total open positions value).
 */
export function calculateTotalEquity(
  cashUSD: number,
  positions: Position[],
  prices: Record<string, number>
): number {
  const positionsValue = positions.reduce((total, pos) => {
    const currentPrice = prices[pos.symbol] ?? pos.entryPriceUSD;
    return total + calculatePositionValue(pos, currentPrice);
  }, 0);
  return cashUSD + positionsValue;
}

/**
 * Computes trade statistics from closed trading history.
 */
export function calculateTradeStats(history: ClosedTrade[]): PortfolioStats {
  if (!history.length) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRatePct: 0,
      netPnLUSD: 0,
      grossProfitUSD: 0,
      grossLossUSD: 0,
      profitFactor: 0,
    };
  }

  let grossProfit = 0;
  let grossLoss = 0;
  let winningTrades = 0;
  let losingTrades = 0;

  for (const trade of history) {
    if (trade.realizedPnLUSD > 0) {
      winningTrades++;
      grossProfit += trade.realizedPnLUSD;
    } else if (trade.realizedPnLUSD < 0) {
      losingTrades++;
      grossLoss += Math.abs(trade.realizedPnLUSD);
    }
  }

  const totalTrades = history.length;
  const winRatePct = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const netPnLUSD = grossProfit - grossLoss;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRatePct,
    netPnLUSD,
    grossProfitUSD: grossProfit,
    grossLossUSD: grossLoss,
    profitFactor,
  };
}
