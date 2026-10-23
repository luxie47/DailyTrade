import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Asset, Timeframe } from '../types/market';
import { ASSETS } from '../data/assets';
import { STORAGE_KEYS } from '../config/constants';
import type { ToastMessage } from '../components/Toast';
import { dispatchSystemNotification } from '../services/priceAlerts';
import { safeUUID } from '../utils/uuid';

export type Tab = 'trade' | 'markets' | 'portfolio' | 'accounts';
export type AccountModalView = 'list' | 'create' | 'about';

interface UIContextValue {
  tab: Tab;
  setTab: (tab: Tab) => void;
  selectedAsset: Asset;
  setSelectedAsset: (asset: Asset) => void;
  detailAsset: Asset | null;
  setDetailAsset: (asset: Asset | null) => void;
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  favorites: string[];
  toggleFavorite: (symbol: string) => void;
  toasts: ToastMessage[];
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  notify: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
  showTradeModal: boolean;
  setShowTradeModal: (show: boolean) => void;
  showAccountModal: boolean;
  setShowAccountModal: (show: boolean) => void;
  accountModalView: AccountModalView;
  setAccountModalView: (view: AccountModalView) => void;
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

const DEFAULT_ASSET = ASSETS[0];

export function UIProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>('trade');
  const [selectedAsset, setSelectedAsset] = useState<Asset>(DEFAULT_ASSET);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');

  // Modals state
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountModalView, setAccountModalView] = useState<AccountModalView>('list');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return saved ? JSON.parse(saved) : ['BTCUSDT', 'AAPL', 'RELIANCE.NS', 'GC=F'];
    } catch {
      return ['BTCUSDT', 'AAPL', 'RELIANCE.NS', 'GC=F'];
    }
  });

  const toggleFavorite = useCallback((symbol: string) => {
    setFavorites(prev => {
      const next = prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol];
      try {
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(next));
      } catch {
        // ignore localStorage quota errors
      }
      return next;
    });
  }, []);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((title: string, message?: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = safeUUID();
    setToasts(prev => [...prev.slice(-3), { id, title, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const notify = useCallback((title: string, message: string, type: 'success' | 'error' | 'info') => {
    addToast(title, message, type);
    dispatchSystemNotification(title, message);
  }, [addToast]);

  return (
    <UIContext.Provider
      value={{
        tab,
        setTab,
        selectedAsset,
        setSelectedAsset,
        detailAsset,
        setDetailAsset,
        timeframe,
        setTimeframe,
        favorites,
        toggleFavorite,
        toasts,
        addToast,
        dismissToast,
        notify,
        showTradeModal,
        setShowTradeModal,
        showAccountModal,
        setShowAccountModal,
        accountModalView,
        setAccountModalView,
        showExportModal,
        setShowExportModal,
        showImportModal,
        setShowImportModal,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
