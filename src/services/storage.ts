import type { Account, Currency, EquityPoint } from '../types/account';
import type { Position, ClosedTrade, Order } from '../types/trade';
import { CURRENCIES } from '../types/account';

const KEY = 'dailytrade_v1';

export interface AppState {
  accounts: Account[];
  activeAccountId: string;
  positions: Position[];
  orders: Order[];
  history: ClosedTrade[];
  equityHistory: Record<string, EquityPoint[]>; // keyed by accountId
}

function defaults(): AppState {
  const id = crypto.randomUUID();
  return {
    accounts: [{
      id,
      name: 'My Portfolio',
      currency: 'USD',
      cashUSD: 10000,
      startingCashUSD: 10000,
      createdAt: Date.now(),
    }],
    activeAccountId: id,
    positions: [],
    orders: [],
    history: [],
    equityHistory: { [id]: [{ time: Math.floor(Date.now() / 1000), value: 10000 }] },
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
        if (!parsed.accounts.some(a => a.id === parsed.activeAccountId)) {
          parsed.activeAccountId = parsed.accounts[0].id;
        }
        if (!Array.isArray(parsed.positions)) parsed.positions = [];
        if (!Array.isArray(parsed.orders)) parsed.orders = [];
        if (!Array.isArray(parsed.history)) parsed.history = [];
        // Migrate: if equityHistory is an old flat array, convert to per-account map
        if (Array.isArray(parsed.equityHistory)) {
          const activeId = parsed.activeAccountId;
          parsed.equityHistory = { [activeId]: parsed.equityHistory as unknown as EquityPoint[] };
        }
        if (typeof parsed.equityHistory !== 'object' || parsed.equityHistory === null) {
          parsed.equityHistory = {};
        }
        return parsed;
      }
    }
  } catch { /* corrupt data — start fresh */ }
  return defaults();
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function exportJSON(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dailytrade_backup_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(json: string): AppState {
  const parsed = JSON.parse(json) as AppState;
  // basic validation
  if (!Array.isArray(parsed.accounts) || !parsed.activeAccountId) throw new Error('Invalid backup');
  return parsed;
}

// ─── Currency formatting ───────────────────────────────────────────────────────
export function formatCurrency(usdAmount: number, currency: Currency, compact = false): string {
  const cfg = CURRENCIES.find(c => c.code === currency)!;
  const amount = usdAmount * cfg.usdRate;
  if (compact && Math.abs(amount) >= 1_000_000)
    return `${cfg.symbol}${(amount / 1_000_000).toFixed(2)}M`;
  if (compact && Math.abs(amount) >= 1_000)
    return `${cfg.symbol}${(amount / 1_000).toFixed(1)}K`;
  const dec = Math.abs(amount) < 1 ? 4 : 2;
  return `${cfg.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
}

export function formatPct(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}
