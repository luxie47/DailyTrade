import { getAssetUSDMultiplier } from '../../utils/formatPrice';

/** Standard Exness-style quick lot presets */
export const LOT_PRESETS = [0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1.00] as const;
export const DEFAULT_LOT = 0.01;
export const MIN_LOT = 0.01;
export const MAX_LOT = 100.00;
export const LOT_STEP = 0.01;

/**
 * Returns standard contract size (units per 1.00 lot) for an asset.
 * - Forex: 100,000 units of base currency (0.01 lot = 1,000 units)
 * - Gold / Silver / Metals: 100 troy ounces
 * - Crypto: 1 coin (0.01 lot = 0.01 coin)
 * - Stocks / Indices: 1 share / contract
 */
export function getContractSize(symbol: string, assetClass?: string): number {
  const sym = symbol.toUpperCase();
  if (sym.startsWith('XAU') || sym.startsWith('GC=') || sym.startsWith('SI=')) {
    return 100; // Metals
  }
  if (sym.endsWith('=X') || assetClass === 'forex') {
    return 100000; // Standard forex contract
  }
  if (sym.endsWith('USDT') || assetClass === 'crypto') {
    return 1; // Crypto: 1 lot = 1 unit
  }
  return 1; // Default stocks/indices: 1 lot = 1 share
}

/**
 * Returns standard broker leverage for margin calculations.
 * - Forex: 1:100
 * - Metals: 1:50
 * - Crypto: 1:10
 * - Stocks / Funds: 1:5
 */
export function getAssetLeverage(symbol: string, assetClass?: string): number {
  const sym = symbol.toUpperCase();
  if (sym.endsWith('=X') || assetClass === 'forex') {
    return 100;
  }
  if (sym.startsWith('XAU') || sym.startsWith('GC=')) {
    return 50;
  }
  if (sym.endsWith('USDT') || assetClass === 'crypto') {
    return 10;
  }
  return 5;
}

/**
 * Converts lot size to effective tradable units.
 */
export function lotToUnits(lot: number, symbol: string, assetClass?: string): number {
  const isInvalid = !Number.isFinite(lot) || isNaN(lot);
  const safeLot = isInvalid ? DEFAULT_LOT : Math.min(MAX_LOT, Math.max(MIN_LOT, lot));
  const contract = getContractSize(symbol, assetClass);
  return Number((safeLot * contract).toFixed(6));
}

/**
 * Converts effective units back to lot size.
 */
export function unitsToLot(units: number, symbol: string, assetClass?: string): number {
  const contract = getContractSize(symbol, assetClass);
  if (contract <= 0) return DEFAULT_LOT;
  const rawLot = units / contract;
  return Number(Math.max(MIN_LOT, rawLot).toFixed(2));
}

/**
 * Computes required margin in USD to open a given lot size.
 * Formula: (Lot * ContractSize * AssetPrice * USDMultiplier) / Leverage
 */
export function calculateRequiredMargin(
  lot: number,
  price: number,
  symbol: string,
  assetClass?: string
): number {
  if (lot <= 0 || price <= 0 || isNaN(lot) || isNaN(price)) return 0;
  const contract = getContractSize(symbol, assetClass);
  const mult = getAssetUSDMultiplier(symbol);
  const leverage = getAssetLeverage(symbol, assetClass);
  const notionalUSD = lot * contract * price * mult;
  return Number((notionalUSD / leverage).toFixed(2));
}

/**
 * Formats lot value to 2 decimal places (e.g. 0.05).
 */
export function formatLot(lot: number): string {
  if (isNaN(lot) || lot <= 0) return '0.01';
  return lot.toFixed(2);
}

/**
 * Calculates potential PnL in USD for a given target price (SL or TP)
 * against an entry price, trade side, and lot size (or unit quantity).
 * Anticheat & Bounds: Handles NaN, 0, negative lots safely with fallback to MIN_LOT.
 */
export function calculatePotentialPnL(
  entryPrice: number,
  targetPrice: number,
  side: 'long' | 'short' | 'buy' | 'sell',
  lot: number | undefined,
  units: number | undefined,
  symbol: string,
  assetClass?: string
): number {
  if (
    !entryPrice || !targetPrice ||
    !Number.isFinite(entryPrice) || !Number.isFinite(targetPrice) ||
    isNaN(entryPrice) || isNaN(targetPrice) ||
    entryPrice <= 0 || targetPrice <= 0
  ) {
    return 0;
  }

  // Resolve effective units: use lot if provided; otherwise fallback to units
  let effectiveUnits: number;
  if (lot !== undefined && Number.isFinite(lot) && lot > 0) {
    effectiveUnits = lotToUnits(lot, symbol, assetClass);
  } else if (units !== undefined && Number.isFinite(units) && units > 0) {
    effectiveUnits = units;
  } else {
    effectiveUnits = lotToUnits(DEFAULT_LOT, symbol, assetClass);
  }

  const mult = getAssetUSDMultiplier(symbol);
  const isLong = side === 'long' || side === 'buy';
  const priceDiff = isLong ? (targetPrice - entryPrice) : (entryPrice - targetPrice);

  const rawPnL = priceDiff * effectiveUnits * mult;
  return Number.isFinite(rawPnL) ? Number(rawPnL.toFixed(2)) : 0;
}

/**
 * Formats potential dollar amount with explicit sign and symbol:
 * e.g. "+$145.20" or "-$50.00"
 */
export function formatPotentialPnL(pnlUSD: number): string {
  if (isNaN(pnlUSD)) return '$0.00';
  const prefix = pnlUSD > 0 ? '+$' : pnlUSD < 0 ? '-$' : '$';
  return `${prefix}${Math.abs(pnlUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

