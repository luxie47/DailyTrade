export const STORAGE_KEYS = {
  APP_STATE: 'dailytrade_v1',
  PRICES_CACHE: 'dt_prices_cache',
  FAVORITES: 'dailytrade_favorites',
} as const;

export const TIMERS = {
  EQUITY_SNAPSHOT_MS: 30_000,
  SYNTHETIC_TICK_MS: 1_200,
  WS_RECONNECT_DELAY_MS: 3_000,
  MAX_EQUITY_HISTORY_POINTS: 500,
  MARKET_NOTIFICATION_INTERVAL_HOURS: 12,
} as const;

export const DEFAULT_ACCOUNT = {
  NAME: 'My Portfolio',
  CURRENCY: 'USD' as const,
  STARTING_CASH: 10_000,
} as const;

export const APP_METADATA = {
  NAME: 'DailyTrade',
  DONATE_URL: 'https://buymeachai.ezee.li/luxie47',
  DONATE_LABEL: 'Buy Me A Chai 🍵 / Donate',
} as const;
