// ─── Currency & Account Types ──────────────────────────────────────────────

export type Currency = 'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  label: string;
  usdRate: number; // 1 USD = X units of this currency (approx)
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$',  label: 'US Dollar',       usdRate: 1 },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee',    usdRate: 84 },
  { code: 'EUR', symbol: '€', label: 'Euro',             usdRate: 0.92 },
  { code: 'GBP', symbol: '£', label: 'British Pound',   usdRate: 0.79 },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen',    usdRate: 149 },
];

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  cashUSD: number;         // always stored in USD internally
  startingCashUSD: number;
  createdAt: number;
}

// Snapshot of total portfolio value over time (equity curve)
export interface EquityPoint {
  time: number;    // Unix seconds
  value: number;   // total net worth in USD
}
