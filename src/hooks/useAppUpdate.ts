import { useState, useEffect, useCallback, useRef } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { isCapacitorNative } from '../config/env';
import { installNativeApk } from '../native/widgetBridge';
import { dispatchSystemNotification } from '../services/priceAlerts';

export interface UpdateInfo {
  version: string;
  name: string;
  notes: string[];
  apkUrl: string;
  publishedAt: string;
}

const GITHUB_REPO = 'luxie47/DailyTrade';

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isReadyToInstall, setIsReadyToInstall] = useState<boolean>(false);
  const [downloadedPath, setDownloadedPath] = useState<string | null>(null);
  const progressHandleRef = useRef<{ remove: () => Promise<void> } | null>(null);

  // Compare semantic versions safely (e.g. "1.3.1" > "1.3.0")
  const isNewer = (remote: string, current: string): boolean => {
    const r = remote.replace(/^v/, '').split('.').map(s => parseInt(s, 10) || 0);
    const c = current.replace(/^v/, '').split('.').map(s => parseInt(s, 10) || 0);
    for (let i = 0; i < Math.max(r.length, c.length); i++) {
      const numR = r[i] || 0;
      const numC = c[i] || 0;
      if (numR > numC) return true;
      if (numR < numC) return false;
    }
    return false;
  };

  const checkForUpdates = useCallback(async () => {
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      const tagName = data.tag_name || '';
      if (isNewer(tagName, __APP_VERSION__)) {
        const apkAsset = Array.isArray(data.assets)
          ? data.assets.find((a: any) => typeof a.name === 'string' && a.name.endsWith('.apk'))
          : null;
        const apkUrl = apkAsset?.browser_download_url || data.html_url || '';

        // Strictly isolate ONLY the latest release section
        const bodyText = (data.body || '').trim();
        const sectionMatch = bodyText.match(/(?:##\s*\[?[vV]?\d[\s\S]*?|##\s*What's\s*Changed[\s\S]*?)(?=\r?\n(?:---|##\s*\[?[vV]?\d)|$)/i);
        const latestSection = sectionMatch ? sectionMatch[0] : bodyText;

        // Extract explicit bullet lines first
        let rawNotes = latestSection.split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• '))
          .map((line: string) => line.replace(/^[-*•\d.]+\s*/, ''))
          .filter((line: string) => line.length > 3);

        // Fallback: non-empty, non-header lines if no markdown bullets found
        if (rawNotes.length === 0) {
          rawNotes = latestSection.split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => {
              if (!line || line.length <= 3) return false;
              if (line.startsWith('#') || line.startsWith('---')) return false;
              const lower = line.toLowerCase();
              if (lower.includes('full changelog') || lower.includes('/compare/')) return false;
              if (lower.includes('all notable changes') || lower.includes('documented in this file')) return false;
              return true;
            })
            .map((line: string) => line.replace(/^[-*•\d.]+\s*/, ''))
            .filter((line: string) => line.length > 3);
        }

        setUpdateInfo({
          version: tagName.replace(/^v/, ''),
          name: data.name || `Version ${tagName}`,
          notes: rawNotes.length > 0 ? rawNotes.slice(0, 5) : ['Performance improvements & bug fixes'],
          apkUrl,
          publishedAt: data.published_at || '',
        });
        setShowModal(true);

        // Dispatch formal system notification once per new version
        try {
          const lastNotified = localStorage.getItem('dt_last_notified_update_version');
          if (lastNotified !== tagName) {
            dispatchSystemNotification(
              `DailyTrade ${tagName} Available`,
              'New build ready with feature enhancements and performance improvements. Tap to install.'
            );
            localStorage.setItem('dt_last_notified_update_version', tagName);
          }
        } catch {
          // ignore localStorage access issues
        }
      }
    } catch {
      // Offline or network error — silent fail in background
    }
  }, []);

  useEffect(() => {
    // Check for updates promptly on startup / reload
    const timer = setTimeout(checkForUpdates, 600);
    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  const triggerInstall = useCallback(async () => {
    if (downloadedPath && isCapacitorNative()) {
      await installNativeApk(downloadedPath);
      return;
    }
    if (!updateInfo?.apkUrl) return;

    if (isCapacitorNative()) {
      window.open(updateInfo.apkUrl, '_system');
    } else {
      // In browser / PWA: open direct download
      const a = document.createElement('a');
      a.href = updateInfo.apkUrl;
      a.download = `DailyTrade_${updateInfo.version}.apk`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [downloadedPath, updateInfo]);

  const startDownload = useCallback(async () => {
    if (!updateInfo || isDownloading || isReadyToInstall) return;
    setIsDownloading(true);
    setDownloadProgress(2);

    if (isCapacitorNative()) {
      try {
        const fileName = `DailyTrade_${updateInfo.version}.apk`;

        // Listen for real-time byte progress
        if (progressHandleRef.current) {
          try { await progressHandleRef.current.remove(); } catch { /* ok */ }
        }
        progressHandleRef.current = await Filesystem.addListener('progress', (status) => {
          if (status.contentLength > 0) {
            const pct = Math.min(99, Math.round((status.bytes / status.contentLength) * 100));
            setDownloadProgress(Math.max(5, pct));
          }
        });

        const res = await Filesystem.downloadFile({
          url: updateInfo.apkUrl,
          path: fileName,
          directory: Directory.Cache,
          progress: true,
          recursive: true,
        });

        if (progressHandleRef.current) {
          try { await progressHandleRef.current.remove(); } catch { /* ok */ }
          progressHandleRef.current = null;
        }

        const localPath = res.path || '';
        setDownloadedPath(localPath);
        setDownloadProgress(100);
        setIsDownloading(false);
        setIsReadyToInstall(true);

        // Instant 1-tap Orion Store trigger: launch Android package installer
        setTimeout(async () => {
          await installNativeApk(localPath);
        }, 350);
      } catch (err) {
        console.error('Failed to download APK via Filesystem:', err);
        setIsDownloading(false);
        // Fallback to external trigger if download error occurs
        window.open(updateInfo.apkUrl, '_system');
      }
    } else {
      // Web / Dev simulation or direct browser download
      let current = 10;
      setDownloadProgress(current);
      const interval = setInterval(() => {
        current += Math.floor(Math.random() * 15) + 12;
        if (current >= 100) {
          clearInterval(interval);
          setDownloadProgress(100);
          setIsDownloading(false);
          setIsReadyToInstall(true);
          triggerInstall();
        } else {
          setDownloadProgress(current);
        }
      }, 180);
    }
  }, [updateInfo, isDownloading, isReadyToInstall, triggerInstall]);

  const dismiss = useCallback(() => {
    setShowModal(false);
  }, []);

  return {
    currentVersion: __APP_VERSION__,
    updateInfo,
    showModal,
    setShowModal,
    isDownloading,
    downloadProgress,
    isReadyToInstall,
    checkForUpdates,
    startDownload,
    triggerInstall,
    dismiss,
  };
}
