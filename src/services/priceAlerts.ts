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

    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: notifId++,
          title,
          body,
          schedule: { at: new Date(Date.now() + 100) },
          smallIcon: 'ic_launcher',
        }],
      });
    } catch {
      // Browser environment fallback
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body });
        } catch {}
      }
    }
  }
}
