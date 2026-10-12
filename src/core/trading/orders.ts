import type { Order, Position, ClosedTrade } from '../../types/trade';
import { getAssetUSDMultiplier } from '../../utils/formatPrice';

export interface OrderValidationResult {
  valid: boolean;
  error?: string;
  costUSD?: number;
}

/**
 * Validates a market buy order against cash balance and inputs.
 */
export function validateMarketBuy(
  cashUSD: number,
  symbol: string,
  quantity: number,
  priceUSD: number
): OrderValidationResult {
  if (quantity <= 0 || isNaN(quantity)) {
    return { valid: false, error: 'Invalid quantity' };
  }
  if (priceUSD <= 0 || isNaN(priceUSD)) {
    return { valid: false, error: 'Invalid price' };
  }
  const multiplier = getAssetUSDMultiplier(symbol);
  const cost = priceUSD * quantity * multiplier;
  if (cost > cashUSD) {
    return { valid: false, error: 'Insufficient cash', costUSD: cost };
  }
  return { valid: true, costUSD: cost };
}

/**
 * Validates a market sell order against existing open position.
 */
export function validateMarketSell(
  position: Position | undefined,
  quantity: number
): OrderValidationResult {
  if (!position) {
    return { valid: false, error: 'No open position to sell' };
  }
  if (quantity <= 0 || isNaN(quantity)) {
    return { valid: false, error: 'Invalid quantity' };
  }
  if (quantity > position.quantity) {
    return { valid: false, error: `Max sellable: ${position.quantity}` };
  }
  return { valid: true };
}

/**
 * Validates a limit order against cash and price.
 */
export function validateLimitOrder(
  cashUSD: number,
  side: 'buy' | 'sell',
  quantity: number,
  limitPrice: number,
  symbol?: string
): OrderValidationResult {
  if (quantity <= 0 || isNaN(quantity)) {
    return { valid: false, error: 'Invalid quantity' };
  }
  if (limitPrice <= 0 || isNaN(limitPrice)) {
    return { valid: false, error: 'Invalid limit price' };
  }
  if (side === 'buy') {
    const multiplier = symbol ? getAssetUSDMultiplier(symbol) : 1;
    const cost = limitPrice * quantity * multiplier;
    if (cost > cashUSD) {
      return { valid: false, error: 'Insufficient cash', costUSD: cost };
    }
    return { valid: true, costUSD: cost };
  }
  return { valid: true };
}

/**
 * Determines whether a pending order should fill at current market price.
 */
export function shouldOrderFill(order: Order, currentPrice: number): boolean {
  if (order.status !== 'pending' || !currentPrice || currentPrice <= 0) {
    return false;
  }
  const target = order.limitPrice;
  if (target == null) return false;

  switch (order.type) {
    case 'limit':
      return order.side === 'buy' ? currentPrice <= target : currentPrice >= target;
    case 'take_profit':
      return currentPrice >= target;
    case 'stop_loss':
      return currentPrice <= target;
    default:
      return false;
  }
}

/**
 * Computes trade result when closing a position.
 */
export function createClosedTrade(
  accountId: string,
  position: Position,
  exitPriceUSD: number,
  quantity: number = position.quantity
): ClosedTrade {
  const multiplier = getAssetUSDMultiplier(position.symbol);
  const realizedPnLUSD = (exitPriceUSD - position.entryPriceUSD) * quantity * multiplier;

  return {
    id: crypto.randomUUID(),
    accountId,
    symbol: position.symbol,
    quantity,
    entryPriceUSD: position.entryPriceUSD,
    exitPriceUSD,
    realizedPnLUSD,
    entryTime: position.entryTime,
    exitTime: Date.now(),
  };
}
