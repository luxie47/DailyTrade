export const ENV = {
  BINANCE_WS_URL: (import.meta.env.VITE_BINANCE_WS_URL as string) || 'wss://stream.binance.com:9443/ws',
  BINANCE_REST_URL: (import.meta.env.VITE_BINANCE_REST_URL as string) || 'https://api.binance.com',
  YAHOO_BASE_URL: (import.meta.env.VITE_YAHOO_BASE_URL as string) || 'https://query1.finance.yahoo.com',
  ALLORIGINS_PROXY: (import.meta.env.VITE_ALLORIGINS_PROXY as string) || 'https://api.allorigins.win/raw?url=',
  DEV_PROXY_PREFIX: '/api/yahoo',
  CANDLE_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  DEFAULT_TIMEOUT_MS: 8_000,
} as const;

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

export function isLocalDev(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' && !isCapacitorNative();
}
