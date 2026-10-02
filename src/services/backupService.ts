import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import type { AppState } from './storage';
import { loadState, saveState } from './storage';

export const BACKUP_FOLDER = 'DailyTrade';
export const AUTO_BACKUP_FILE = 'dailytrade_autobackup.json';

export interface DeviceBackupFile {
  name: string;
  uri?: string;
  mtime?: number;
  size?: number;
}

export interface BackupPreview {
  accountCount: number;
  totalCashUSD: number;
  openPositionsCount: number;
  closedTradesCount: number;
  exportedAt?: number;
}

/**
 * Checks and creates the Documents/DailyTrade folder if native
 */
export async function ensureBackupDirectory(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    await Filesystem.mkdir({
      path: BACKUP_FOLDER,
      directory: Directory.Documents,
      recursive: true,
    });
    return true;
  } catch (err: unknown) {
    const msg = (err as Error)?.message || '';
    if (msg.includes('exists') || msg.includes('Directory exists')) {
      return true;
    }
    console.warn('[BackupService] mkdir error:', err);
    return false;
  }
}

/**
 * Saves state to a JSON backup file in Documents/DailyTrade/
 */
export async function saveBackupToFile(state: AppState, fileName?: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const sanitizedName = (fileName?.trim() ? fileName.trim() : `dailytrade_backup_${new Date().toISOString().slice(0, 10)}`)
    .replace(/[^\w\d-_.]/g, '_')
    .replace(/\.json$/i, '') + '.json';

  const payload = {
    ...state,
    _backupMetadata: {
      version: '1.0.0',
      exportedAt: Date.now(),
      platform: Capacitor.getPlatform(),
    }
  };
  const jsonString = JSON.stringify(payload, null, 2);

  if (Capacitor.isNativePlatform()) {
    try {
      await ensureBackupDirectory();
      const res = await Filesystem.writeFile({
        path: `${BACKUP_FOLDER}/${sanitizedName}`,
        data: jsonString,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      return { success: true, filePath: res.uri || `Documents/${BACKUP_FOLDER}/${sanitizedName}` };
    } catch (err: unknown) {
      console.error('[BackupService] Write error:', err);
      return { success: false, error: (err as Error)?.message || 'Failed to save to device storage' };
    }
  } else {
    // Web / Desktop fallback: Trigger direct browser download
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sanitizedName;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true, filePath: sanitizedName };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || 'Export download failed' };
    }
  }
}

/**
 * Silent auto-backup called whenever a trade or order or account state changes
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
export function triggerAutoBackup(state: AppState): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await ensureBackupDirectory();
        await Filesystem.writeFile({
          path: `${BACKUP_FOLDER}/${AUTO_BACKUP_FILE}`,
          data: JSON.stringify(state),
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true,
        });
      } else {
        saveState(state);
      }
    } catch (e) {
      console.warn('[BackupService] Silent auto-backup skipped:', e);
    }
  }, 1000);
}

/**
 * Lists backups stored in Documents/DailyTrade (on Android/Native)
 */
export async function listDeviceBackups(): Promise<DeviceBackupFile[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    await ensureBackupDirectory();
    const result = await Filesystem.readdir({
      path: BACKUP_FOLDER,
      directory: Directory.Documents,
    });
    return result.files
      .filter(f => f.name.endsWith('.json'))
      .map(f => ({
        name: f.name,
        uri: f.uri,
        mtime: f.mtime,
        size: f.size,
      }))
      .sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
  } catch (err) {
    console.warn('[BackupService] Readdir error:', err);
    return [];
  }
}

/**
 * Reads a backup JSON file from Documents/DailyTrade
 */
export async function readDeviceBackup(fileName: string): Promise<AppState> {
  const content = await Filesystem.readFile({
    path: `${BACKUP_FOLDER}/${fileName}`,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  });

  const raw = typeof content.data === 'string' ? content.data : '';
  const parsed = JSON.parse(raw) as AppState;
  if (!Array.isArray(parsed.accounts) || !parsed.activeAccountId) {
    throw new Error('Invalid backup schema');
  }
  return parsed;
}

/**
 * Analyzes backup data to provide a preview summary for user confirmation
 */
export function getBackupPreview(data: AppState): BackupPreview {
  const accountCount = data.accounts?.length || 0;
  const totalCashUSD = data.accounts?.reduce((sum, a) => sum + (a.cashUSD || 0), 0) || 0;
  const openPositionsCount = data.positions?.length || 0;
  const closedTradesCount = data.history?.length || 0;
  const exportedAt = (data as unknown as { _backupMetadata?: { exportedAt?: number } })._backupMetadata?.exportedAt;

  return {
    accountCount,
    totalCashUSD,
    openPositionsCount,
    closedTradesCount,
    exportedAt,
  };
}

/**
 * Merges imported state into current state without dropping existing accounts
 */
export function mergeAppState(currentState: AppState, imported: AppState): AppState {
  const existingAccountIds = new Set(currentState.accounts.map(a => a.id));
  const newAccounts = [...currentState.accounts];
  const newPositions = [...currentState.positions];
  const newOrders = [...currentState.orders];
  const newHistory = [...currentState.history];
  const newEquityHistory = { ...currentState.equityHistory };

  for (const importedAcc of imported.accounts) {
    if (!existingAccountIds.has(importedAcc.id)) {
      newAccounts.push(importedAcc);
      if (imported.equityHistory && imported.equityHistory[importedAcc.id]) {
        newEquityHistory[importedAcc.id] = imported.equityHistory[importedAcc.id];
      }
    } else {
      // Re-map duplicated account ID to preserve both
      const generatedId = crypto.randomUUID();
      const clonedAcc = { ...importedAcc, id: generatedId, name: `${importedAcc.name} (Restored)` };
      newAccounts.push(clonedAcc);
      if (imported.equityHistory && imported.equityHistory[importedAcc.id]) {
        newEquityHistory[generatedId] = imported.equityHistory[importedAcc.id];
      }
      // Re-map child positions/orders/history
      imported.positions.filter(p => p.accountId === importedAcc.id).forEach(p => {
        newPositions.push({ ...p, id: crypto.randomUUID(), accountId: generatedId });
      });
      imported.orders.filter(o => o.accountId === importedAcc.id).forEach(o => {
        newOrders.push({ ...o, id: crypto.randomUUID(), accountId: generatedId });
      });
      imported.history.filter(h => h.accountId === importedAcc.id).forEach(h => {
        newHistory.push({ ...h, id: crypto.randomUUID(), accountId: generatedId });
      });
    }
  }

  // Also include positions for uniquely imported accounts
  for (const pos of imported.positions) {
    if (!newPositions.some(p => p.id === pos.id)) {
      newPositions.push(pos);
    }
  }
  for (const ord of imported.orders) {
    if (!newOrders.some(o => o.id === ord.id)) {
      newOrders.push(ord);
    }
  }
  for (const h of imported.history) {
    if (!newHistory.some(existingH => existingH.id === h.id)) {
      newHistory.push(h);
    }
  }

  return {
    accounts: newAccounts,
    activeAccountId: currentState.activeAccountId || newAccounts[0]?.id || '',
    positions: newPositions,
    orders: newOrders,
    history: newHistory,
    equityHistory: newEquityHistory,
  };
}

/**
 * Automatically checks on startup if localStorage was wiped (or first start after update)
 * and restores silently from Documents/DailyTrade/dailytrade_autobackup.json if available.
 */
export async function checkAndAutoRestore(): Promise<{ restored: boolean; restoredState?: AppState }> {
  if (!Capacitor.isNativePlatform()) return { restored: false };
  try {
    const cur = loadState();
    const isBlankDefault =
      cur.accounts.length === 1 &&
      cur.positions.length === 0 &&
      cur.orders.length === 0 &&
      cur.history.length === 0 &&
      cur.accounts[0].cashUSD === 10000 &&
      cur.accounts[0].name === 'My Portfolio';

    if (isBlankDefault) {
      const backupData = await readDeviceBackup(AUTO_BACKUP_FILE);
      if (backupData && backupData.accounts?.length > 0) {
        saveState(backupData);
        return { restored: true, restoredState: backupData };
      }
    }
  } catch {
    // No auto-backup found or unreadable, continue normal flow
  }
  return { restored: false };
}
