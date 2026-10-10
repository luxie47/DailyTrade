import { LocalNotifications } from '@capacitor/local-notifications';

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  createdAt: number;
  triggered: boolean;
}

const ALERTS_KEY = 'dt_price_alerts';

export function loadAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveAlerts(alerts: PriceAlert[]): void {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  } catch {}
}

export function addAlert(alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>): PriceAlert {
  const alerts = loadAlerts();
  const newAlert: PriceAlert = {
    ...alert,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'alt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    createdAt: Date.now(),
    triggered: false,
  };
  saveAlerts([...alerts, newAlert]);
  return newAlert;
}

export function removeAlert(id: string): void {
  saveAlerts(loadAlerts().filter(a => a.id !== id));
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    if (display === 'granted') return true;
  } catch {
    // Ignore and fallback to web Notification
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {}
  }
  return false;
}

let notifId = 1000;
export async function dispatchSystemNotification(title: string, body: string): Promise<void> {
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: notifId++,
        title,
        body,
        schedule: { at: new Date(Date.now() + 50) },
        smallIcon: 'ic_launcher',
      }],
    });
    return;
  } catch {
    // Ignore native error, fallback to browser
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body });
    } catch {}
  }
}

const CHEESY_KEY = 'dt_last_cheesy_notif';
const MARKET_PULSE_MESSAGES = [
  "📈 Market Pulse: Review your open positions and active orders.",
  "💼 Portfolio Update: Check today's market performance and equity.",
  "📊 Active Sessions: Global markets are moving. Inspect your watchlist.",
  "🎯 Risk Check: Ensure your stop losses and profit targets remain set.",
  "⚡ Volatility Alert: Significant price movement observed across major assets.",
  "🔍 12-Hour Recap: Check your unrealized P&L and daily return heatmap.",
  "🔔 Market Movers: Notable swings recorded on global equities and crypto.",
  "🛡️ Protection Reminder: Review your active trade stop loss thresholds.",
  "📈 Market Activity: New market highs and dips forming across monitored assets.",
  "🌐 Session Transition: European and US trading sessions are active.",
];

export async function checkCheesyMarketNotification(accountName?: string, topAssetSymbol?: string): Promise<void> {
  try {
    const rawLast = localStorage.getItem(CHEESY_KEY);
    const lastTime = rawLast ? parseInt(rawLast, 10) : 0;
    const now = Date.now();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;

    // Check if 12 hours have elapsed since last cheesy alert
    if (lastTime && now - lastTime < TWELVE_HOURS) return;

    localStorage.setItem(CHEESY_KEY, now.toString());

    // Select random message
    const msg = MARKET_PULSE_MESSAGES[Math.floor(Math.random() * MARKET_PULSE_MESSAGES.length)];
    const title = topAssetSymbol
      ? `📈 DailyTrade — ${topAssetSymbol} & Markets`
      : accountName
      ? `💼 DailyTrade — ${accountName}`
      : '📊 DailyTrade Market Pulse';

    await dispatchSystemNotification(title, msg);
  } catch {}
}

export async function checkAlerts(prices: Record<string, number>): Promise<void> {
  const alerts = loadAlerts();
  if (alerts.length === 0) return;
  const toFire: { alert: PriceAlert; price: number }[] = [];

  for (const alert of alerts) {
    if (alert.triggered) continue;
    const price = prices[alert.symbol];
    if (price == null) continue;

    const shouldFire = alert.direction === 'above'
      ? price >= alert.targetPrice
      : price <= alert.targetPrice;

    if (shouldFire) {
      toFire.push({ alert, price });
    }
  }

  if (toFire.length === 0) return;

  // Atomic state update: mark triggered immediately so fast concurrent price ticks cannot re-fire duplicate notifications
  const firedIds = new Set(toFire.map(item => item.alert.id));
  saveAlerts(alerts.map(a => firedIds.has(a.id) ? { ...a, triggered: true } : a));

  for (const { alert, price } of toFire) {
    const cleanSym = alert.symbol.replace('USDT', '').replace('.NS', '');
    const title = `📈 Price Alert — ${cleanSym}`;
    const body = `Price ${alert.direction === 'above' ? 'reached' : 'dropped to'} ${price.toLocaleString()}`;

    await dispatchSystemNotification(title, body);
  }
}
