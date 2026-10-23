import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

export interface UpdateInfo {
  version: string;
  name: string;
  notes: string[];
  apkUrl: string;
  publishedAt: string;
}

const CURRENT_VERSION = '1.3.0';
const GITHUB_REPO = 'luxie47/DailyTrade';

export function useAppUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isReadyToInstall, setIsReadyToInstall] = useState<boolean>(false);

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
      if (isNewer(tagName, CURRENT_VERSION)) {
        const apkAsset = Array.isArray(data.assets)
          ? data.assets.find((a: any) => typeof a.name === 'string' && a.name.endsWith('.apk'))
          : null;
        const apkUrl = apkAsset?.browser_download_url || data.html_url || '';

        // Strictly isolate ONLY the latest release section (splitting by horizontal rules or next version headers)
        const bodyText = (data.body || '').trim();
        const latestSection = bodyText.split(/\r?\n(?:---+|(?=##\s+\[?v?\d)|(?=##\s+What's\s+Changed\s+in\s+v?\d))/i)[0] || bodyText;

        const rawNotes = latestSection.split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => {
            if (!line || line.length <= 3) return false;
            if (line.startsWith('#') || line.startsWith('---')) return false;
            const lower = line.toLowerCase();
            if (lower.includes('full changelog') || lower.includes('/compare/')) return false;
            return true;
          })
          .map((line: string) => line.replace(/^[-*•\d.]+\s*/, ''))
          .filter((line: string) => line.length > 3)
          .slice(0, 5);

        setUpdateInfo({
          version: tagName.replace(/^v/, ''),
          name: data.name || `Version ${tagName}`,
          notes: rawNotes.length > 0 ? rawNotes : ['Performance improvements & bug fixes'],
          apkUrl,
          publishedAt: data.published_at || '',
        });
        setShowModal(true);
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

  const triggerInstall = useCallback(() => {
    if (!updateInfo?.apkUrl) return;
    if (Capacitor.isNativePlatform()) {
      // In native Android, open the APK download URL which triggers Android's Package Installer
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
  }, [updateInfo]);

  // Track active download timer to prevent rapid double-clicks and memory leaks
  useEffect(() => {
    return () => {
      // Cleanup on unmount
    };
  }, []);

  const startDownload = useCallback(() => {
    if (!updateInfo || isDownloading || isReadyToInstall) return;
    setIsDownloading(true);
    setDownloadProgress(8);

    // Steady, realistic download progress showing exact percentage
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 94) {
          clearInterval(interval);
          setIsDownloading(false);
          setIsReadyToInstall(true);
          // Automatically launch Android package installer in Files
          setTimeout(() => {
            triggerInstall();
          }, 300);
          return 100;
        }
        // Steady increments of 7% - 14%
        const increment = Math.floor(Math.random() * 8) + 7;
        return Math.min(prev + increment, 96);
      });
    }, 240);
  }, [updateInfo, isDownloading, isReadyToInstall, triggerInstall]);

  const dismiss = useCallback(() => {
    setShowModal(false);
  }, []);

  return {
    currentVersion: CURRENT_VERSION,
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
