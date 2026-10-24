import { isCapacitorNative } from '../config/env';
import { formatCurrency } from '../services/storage';
import { formatAssetPrice } from '../utils/formatPrice';
import type { Currency } from '../types/account';

export interface WidgetSyncParams {
  totalEquityUSD: number;
  currency: Currency;
  startingCashUSD: number;
  selectedSymbol: string;
  currentPrice: number;
  positionCount: number;
}

interface WidgetBridgePlugin {
  updateWidget: (data: {
    equity: string;
    pnl: string;
    symbol?: string;
    price?: string;
    change?: string;
    count?: string;
  }) => void;
}

export function syncAndroidWidget({
  totalEquityUSD,
  currency,
  startingCashUSD,
  selectedSymbol,
  currentPrice,
  positionCount,
}: WidgetSyncParams): void {
  if (!isCapacitorNative()) return;

  try {
    const cap = (window as unknown as {
      Capacitor?: {
        Plugins?: {
          WidgetBridge?: WidgetBridgePlugin;
        };
      };
    }).Capacitor;

    const plugin = cap?.Plugins?.WidgetBridge;
    if (!plugin) return;

    const totalPnl = totalEquityUSD - startingCashUSD;
    const cleanSymbol = selectedSymbol.replace('USDT', '').replace('.NS', '');

    plugin.updateWidget({
      equity: formatCurrency(totalEquityUSD, currency),
      pnl: `${totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl, currency, true)} all time`,
      symbol: cleanSymbol,
      price: formatAssetPrice(currentPrice, selectedSymbol),
      change: totalPnl >= 0 ? '+PROFIT' : '-LOSS',
      count: `${positionCount} pos`,
    });
  } catch {
    // Ignore widget sync exceptions if native widget is not installed
  }
}

export async function installNativeApk(filePath: string): Promise<boolean> {
  if (!isCapacitorNative()) return false;
  try {
    const cap = (window as unknown as {
      Capacitor?: {
        Plugins?: {
          WidgetBridge?: {
            installApk?: (data: { filePath: string }) => Promise<void>;
          };
        };
      };
    }).Capacitor;

    const plugin = cap?.Plugins?.WidgetBridge;
    if (plugin?.installApk) {
      await plugin.installApk({ filePath });
      return true;
    }
  } catch (err) {
    console.error('Failed to install APK via native bridge:', err);
  }
  return false;
}
