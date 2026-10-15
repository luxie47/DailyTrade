import { useState, useCallback, useEffect, useRef } from 'react';
import './index.css';

import { useTradingEngine } from './hooks/useTradingEngine';
import { Header }          from './components/Header';
import { BottomNav, type Tab } from './components/BottomNav';
import { TradingViewChart } from './components/TradingViewChart';
import { Watchlist }        from './components/Watchlist';
import { TradeModal }       from './components/TradeModal';
import { PositionsList }    from './components/PositionsList';
import { PortfolioChart }   from './components/PortfolioChart';
import { PortfolioBreakdown } from './components/PortfolioBreakdown';
import { PnLCalendar }        from './components/PnLCalendar';
import { AssetDetail }      from './components/AssetDetail';
import { AssetTradePanel }  from './components/AssetTradePanel';
import { AccountModal }     from './components/AccountModal';
import { ExportModal }      from './components/ExportModal';
import { ImportModal }      from './components/ImportModal';
import { ToastContainer, type ToastMessage } from './components/Toast';

import { ASSETS, ASSET_MAP } from './data/assets';
import type { Asset, Timeframe } from './types/market';
import { formatCurrency, type AppState } from './services/storage';
import { checkAndAutoRestore } from './services/backupService';
import { checkAlerts, dispatchSystemNotification, checkCheesyMarketNotification } from './services/priceAlerts';
import {
  fetchBinanceCandles, fetchCandles, fetchYahooQuote, fetchBatchYahooQuotes,
  subscribeLiveQuote, subscribeAllQuotes, startSyntheticTicks,
} from './services/marketData';
import type { Candle } from './types/market';
import { Download, Shield } from 'lucide-react';
import { formatAssetPrice, getAssetUSDMultiplier } from './utils/formatPrice';
import { syncAndroidWidget } from './native/widgetBridge';
import { TIMERS, STORAGE_KEYS } from './config/constants';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

const DEFAULT_ASSET = ASSETS[0]; // BTC

export default function App() {
  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = useCallback((title: string, message?: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev.slice(-3), { id, title, message, type }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleNotify = useCallback((title: string, message: string, type: 'success' | 'error' | 'info') => {
    addToast(title, message, type);
    dispatchSystemNotification(title, message);
  }, [addToast]);

  const engine = useTradingEngine(handleNotify);
  const [tab, setTab] = useState<Tab>('trade');
  const [selectedAsset, setSelectedAsset] = useState<Asset>(DEFAULT_ASSET);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.PRICES_CACHE);
      return cached ? JSON.parse(cached) : {};
    } catch { return {}; }
  });
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [accountModalView, setAccountModalView] = useState<'list' | 'create' | 'about'>('list');
  // SL/TP inline edit state (per position)
  const [sltpEditId, setSltpEditId] = useState<string | null>(null);
  const [editSl, setEditSl] = useState('');
  const [editTp, setEditTp] = useState('');

  // Check for auto-restore after app update / fresh webview state
  useEffect(() => {
    checkAndAutoRestore().then(({ restored, restoredState }) => {
      if (restored && restoredState) {
        engine.replaceState(restoredState);
        addToast(
          'Portfolio Restored',
          'Successfully auto-restored your accounts from device backup (Documents/DailyTrade).',
          'success'
        );
      }
    });
  }, [engine.replaceState, addToast]);

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return saved ? JSON.parse(saved) : ['BTCUSDT', 'AAPL', 'RELIANCE.NS', 'GC=F'];
    } catch {
      return ['BTCUSDT', 'AAPL', 'RELIANCE.NS', 'GC=F'];
    }
  });

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev => {
      const next = prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol];
      try {
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // PWA Install prompt handler
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      addToast('DailyTrade Installed', 'App installed on your device!', 'success');
      setInstallPrompt(null);
    }
  };

  // Merge incoming price updates into shared prices map
  const handlePricesUpdate = useCallback((update: Record<string, number>) => {
    setPrices(prev => {
      const next = { ...prev, ...update };
      try { localStorage.setItem(STORAGE_KEYS.PRICES_CACHE, JSON.stringify(next)); } catch {}
      checkAlerts(next);
      engine.checkLimitOrders(next);
      return next;
    });
  }, [engine.checkLimitOrders]);

  // Periodic 12h cheesy market pulse notification on app start
  useEffect(() => {
    checkCheesyMarketNotification(engine.activeAccount.name, engine.positions[0]?.symbol);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load historical candles whenever asset or timeframe changes
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setCandles([]);
    const isCrypto = selectedAsset.class === 'crypto';
    const loadCandles = isCrypto
      ? fetchBinanceCandles(selectedAsset.quoteSymbol, timeframe, controller.signal)
      : fetchCandles(selectedAsset.quoteSymbol, timeframe, controller.signal);

    loadCandles.then(data => {
      setCandles(data);
      setLoading(false);
    }).catch(() => {
      // Aborted — do nothing, a new fetch is already in flight
    });

    return () => controller.abort();
  }, [selectedAsset, timeframe]);

  // Always-on crypto price stream at App level (not torn down on tab switch)
  useEffect(() => {
    const unsub = subscribeAllQuotes((q) => {
      handlePricesUpdate({ [q.symbol]: q.price });
    });
    return unsub;
  }, [handlePricesUpdate]);

  // Subscribe live price for selected asset
  useEffect(() => {
    const isCrypto = selectedAsset.class === 'crypto';
    let stopSynthetic: (() => void) | null = null;

    if (isCrypto) {
      // Binance live WebSocket for crypto
      const unsub = subscribeLiveQuote(selectedAsset.symbol, (q) => {
        setLivePrice(q.price);
        handlePricesUpdate({ [selectedAsset.symbol]: q.price });
      });
      return unsub;
    } else {
      let cancelled = false;
      const existingPrice = prices[selectedAsset.symbol];
      if (existingPrice) {
        setLivePrice(existingPrice);
        stopSynthetic = startSyntheticTicks(selectedAsset.symbol, existingPrice, (price) => {
          if (cancelled) return;
          setLivePrice(price);
          handlePricesUpdate({ [selectedAsset.symbol]: price });
          engine.checkLimitOrders({ [selectedAsset.symbol]: price });
        }, 1200);
      }

      fetchYahooQuote(selectedAsset.quoteSymbol).then(q => {
        if (cancelled) return;
        const targetPrice = q?.price ?? existingPrice ?? 100;
        setLivePrice(targetPrice);
        handlePricesUpdate({ [selectedAsset.symbol]: targetPrice });
        stopSynthetic?.();
        stopSynthetic = startSyntheticTicks(selectedAsset.symbol, targetPrice, (price) => {
          if (cancelled) return;
          setLivePrice(price);
          handlePricesUpdate({ [selectedAsset.symbol]: price });
          engine.checkLimitOrders({ [selectedAsset.symbol]: price });
        }, 1200);
      });

      return () => {
        cancelled = true;
        stopSynthetic?.();
      };
    }
  }, [selectedAsset, handlePricesUpdate]);

  // Check limit orders on every crypto price update too
  useEffect(() => {
    if (!livePrice || !selectedAsset) return;
    engine.checkLimitOrders({ [selectedAsset.symbol]: livePrice });
  }, [livePrice, selectedAsset]);

  // Record equity snapshot every 30 seconds
  const equityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    equityTimerRef.current = setInterval(() => {
      engine.recordEquity(prices);
    }, TIMERS.EQUITY_SNAPSHOT_MS);
    return () => clearInterval(equityTimerRef.current!);
  }, [prices, engine.recordEquity]);

  // Boot: fetch prices for non-crypto held positions immediately (no Markets tab visit needed)
  useEffect(() => {
    const nonCryptoPositions = engine.state.positions.filter(p => {
      const asset = ASSET_MAP[p.symbol];
      return asset && asset.class !== 'crypto';
    });
    if (nonCryptoPositions.length === 0) return;
    const symbols = [...new Set(
      nonCryptoPositions.map(p => ASSET_MAP[p.symbol]?.quoteSymbol ?? p.symbol)
    )];
    fetchBatchYahooQuotes(symbols).then(results => {
      const priceMap: Record<string, number> = {};
      for (const pos of nonCryptoPositions) {
        const asset = ASSET_MAP[pos.symbol];
        if (!asset) continue;
        const q = results[asset.quoteSymbol];
        if (q) priceMap[pos.symbol] = q.price;
      }
      if (Object.keys(priceMap).length > 0) handlePricesUpdate(priceMap);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalEquityUSD = engine.calcEquity(prices);

  // Sync equity, PnL & ticker to Android Home Screen Widgets (when running on Android)
  useEffect(() => {
    syncAndroidWidget({
      totalEquityUSD,
      currency: engine.activeAccount.currency,
      startingCashUSD: engine.activeAccount.startingCashUSD,
      selectedSymbol: selectedAsset.symbol,
      currentPrice: livePrice ?? prices[selectedAsset.symbol] ?? 0,
      positionCount: engine.positions.length,
    });
  }, [totalEquityUSD, engine.activeAccount.currency, engine.activeAccount.startingCashUSD, engine.positions.length, selectedAsset.symbol, livePrice, prices]);
  const unrPnLUSD = engine.calcUnrealisedPnL(prices);
  const curPrice = livePrice ?? prices[selectedAsset.symbol] ?? 0;

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setTab('trade');
  };

  const handleImport = (s: AppState) => {
    engine.replaceState(s);
    addToast('Portfolio Restored', 'Accounts and trading data loaded.', 'success');
  };

  return (
    <div className="app-shell">
      {/* ── Toast Notifications ───────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── Optional PWA Install Bar ─────────────────────────── */}
      {installPrompt && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(90deg, #1e1b4b, #0f172a)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.4)',
          padding: '6px 14px', zIndex: 100,
        }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Download size={13} color="#a5b4fc" />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#e0e7ff', fontWeight: 600 }}>
              Install DailyTrade APK/App on your device
            </span>
          </div>
          <button
            onClick={handleInstallClick}
            style={{
              background: '#4f46e5', border: 'none', color: '#fff',
              fontSize: 10, fontWeight: 700, padding: '4px 10px',
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
            }}
          >
            INSTALL NOW
          </button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
      <Header
        account={engine.activeAccount}
        totalEquityUSD={totalEquityUSD}
        unrPnLUSD={unrPnLUSD}
        onOpenAccountModal={() => { setAccountModalView('list'); setShowAccountModal(true); }}
        onQuickTopUp={(amt) => engine.topUpAccount(amt)}
      />

      {/* ── Main Content ────────────────────────────────────────── */}
      <ErrorBoundary fallbackTitle="Trading Dashboard Error">
        <main className="app-content">
        {/* TRADE TAB */}
        {tab === 'trade' && (
          <div className="col" style={{ height: '100%', overflow: 'hidden' }}>
            <TradingViewChart
              symbol={selectedAsset.symbol.replace('.NS','').replace('USDT','')}
              name={selectedAsset.name}
              assetClass={selectedAsset.class}
              candles={candles}
              livePrice={livePrice}
              entryPrice={engine.positions.find(p => p.symbol === selectedAsset.symbol)?.entryPriceUSD}
              stopLoss={engine.positions.find(p => p.symbol === selectedAsset.symbol)?.stopLoss}
              takeProfit={engine.positions.find(p => p.symbol === selectedAsset.symbol)?.takeProfit}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              loading={loading}
              onBack={() => setTab('markets')}
            />

            {/* Asset info + Details + Trade button */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-dim)', background: 'var(--bg-card)', flexShrink: 0 }}>
              <div className="row between" style={{ alignItems: 'center' }}>
                <div className="col" style={{ gap: 3 }}>
                  {/* Asset class chip + name */}
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    <span style={{
                      fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600,
                      color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {selectedAsset.class} ·
                    </span>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {selectedAsset.name}
                    </span>
                  </div>

                  {/* Price — mono for numbers */}
                  <div className="row gap-2" style={{ alignItems: 'center', marginTop: 2 }}>
                    {curPrice > 0 ? (
                      <span className="price" style={{ fontSize: 22 }}>
                        {formatAssetPrice(curPrice, selectedAsset.symbol)}
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-muted)' }}>Fetching price…</span>
                    )}
                    <div className="live-dot" />
                  </div>
                </div>

                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 11, padding: '11px 14px', letterSpacing: '0.04em' }}
                    onClick={() => setDetailAsset(selectedAsset)}
                    title="View 52-week stats, P/E, volume & live news"
                  >
                    STATS / NEWS
                  </button>
                  <button
                    className="btn btn-bull"
                    style={{ fontSize: 13, fontWeight: 700, padding: '11px 22px', letterSpacing: '0.05em' }}
                    onClick={() => setShowTradeModal(true)}
                    disabled={!curPrice}
                  >
                    TRADE
                  </button>
                </div>
              </div>

              {/* Open positions for this asset — with inline SL/TP edit strip */}
              {engine.positions.filter(p => p.symbol === selectedAsset.symbol).map(pos => {
                const cur = prices[pos.symbol] ?? pos.entryPriceUSD;
                const isShort = pos.side === 'short';
                const mult = getAssetUSDMultiplier(pos.symbol);
                const diff = isShort ? (pos.entryPriceUSD - cur) : (cur - pos.entryPriceUSD);
                const pnl = diff * pos.quantity * mult;
                const isUp = pnl >= 0;
                const isEditOpen = sltpEditId === pos.id;

                // Price step scales to asset magnitude — BTC=$50, mid-cap=$1, forex=0.0001
                const priceStep = cur >= 50000 ? 50 : cur >= 10000 ? 10 : cur >= 1000 ? 5 : cur >= 100 ? 1 : cur >= 1 ? 0.01 : 0.0001;

                const openEdit = () => {
                  setSltpEditId(pos.id);
                  setEditSl(pos.stopLoss ? pos.stopLoss.toFixed(pos.stopLoss < 1 ? 5 : 2) : '');
                  setEditTp(pos.takeProfit ? pos.takeProfit.toFixed(pos.takeProfit < 1 ? 5 : 2) : '');
                };
                const closeEdit = () => setSltpEditId(null);

                const confirmEdit = () => {
                  const sl = editSl ? parseFloat(editSl) : undefined;
                  const tp = editTp ? parseFloat(editTp) : undefined;
                  if ((sl !== undefined && isNaN(sl)) || (tp !== undefined && isNaN(tp))) return;
                  engine.updatePositionSLTP(pos.id, sl, tp);
                  setSltpEditId(null);
                };

                const clearSLTP = () => {
                  engine.updatePositionSLTP(pos.id, undefined, undefined);
                  setSltpEditId(null);
                };

                // ± stepper helpers
                const stepSl = (dir: 1 | -1) => {
                  const base = editSl ? parseFloat(editSl) : (pos.stopLoss ?? cur);
                  const next = Math.max(0, base + dir * priceStep);
                  setEditSl(next.toFixed(next < 1 ? 5 : 2));
                };
                const stepTp = (dir: 1 | -1) => {
                  const base = editTp ? parseFloat(editTp) : (pos.takeProfit ?? cur);
                  const next = Math.max(0, base + dir * priceStep);
                  setEditTp(next.toFixed(next < 1 ? 5 : 2));
                };

                return (
                  <div key={pos.id} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)', marginTop: 8 }}>
                    {/* Row 1: position summary */}
                    <div className="row between" style={{ padding: '8px 10px', alignItems: 'center' }}>
                      <div className="row gap-2" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                        <span className={`badge ${isShort ? 'badge-bear' : 'badge-bull'}`} style={{ fontSize: 9, flexShrink: 0 }}>
                          {isShort ? 'SHORT' : 'LONG'}
                        </span>
                        {pos.lot && (
                          <span className="badge badge-neutral" style={{ fontSize: 9, flexShrink: 0 }}>
                            {pos.lot} LOT
                          </span>
                        )}
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          @ {formatAssetPrice(pos.entryPriceUSD, pos.symbol)}
                        </span>
                      </div>
                      <div className="row gap-2" style={{ alignItems: 'center', flexShrink: 0 }}>
                        <span className="num font-bold" style={{ fontSize: 12, color: isUp ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                          {isUp ? '+' : ''}{formatCurrency(pnl, engine.activeAccount.currency, true)}
                        </span>
                        <button
                          className="btn"
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            padding: '4px 9px',
                            height: 26,
                            background: isEditOpen
                              ? 'rgba(255, 179, 0, 0.18)'
                              : (pos.stopLoss || pos.takeProfit)
                                ? 'rgba(0, 230, 118, 0.12)'
                                : 'rgba(255, 255, 255, 0.08)',
                            border: isEditOpen
                              ? '1px solid var(--color-gold)'
                              : (pos.stopLoss || pos.takeProfit)
                                ? '1px solid rgba(0, 230, 118, 0.45)'
                                : '1px solid var(--border-mid)',
                            color: isEditOpen
                              ? 'var(--color-gold)'
                              : (pos.stopLoss || pos.takeProfit)
                                ? 'var(--color-bull)'
                                : 'var(--text-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                            transition: 'all 0.12s ease',
                          }}
                          onClick={isEditOpen ? closeEdit : openEdit}
                          title="Edit Stop Loss & Take Profit"
                        >
                          <Shield size={11} strokeWidth={2.4} />
                          <span>SL/TP</span>
                        </button>
                        <button
                          className="btn btn-bear"
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            padding: '4px 10px',
                            height: 26,
                            display: 'inline-flex',
                            alignItems: 'center',
                            boxShadow: '0 1px 3px rgba(255,61,113,0.3)',
                          }}
                          onClick={() => engine.closePosition(pos.id, cur)}
                        >
                          CLOSE
                        </button>
                      </div>
                    </div>

                    {/* Row 2: SL/TP badges (always visible if set) */}
                    {!isEditOpen && (pos.stopLoss || pos.takeProfit) && (
                      <div className="row" style={{ padding: '0 10px 7px', gap: 8, alignItems: 'center' }}>
                        {pos.stopLoss ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--color-bear)', background: 'var(--bg-bear)', border: '1px solid rgba(255,61,113,0.3)', padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            SL {formatAssetPrice(pos.stopLoss, pos.symbol)}
                          </span>
                        ) : null}
                        {pos.takeProfit ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--color-bull)', background: 'var(--bg-bull)', border: '1px solid rgba(0,230,118,0.3)', padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            TP {formatAssetPrice(pos.takeProfit, pos.symbol)}
                          </span>
                        ) : null}
                      </div>
                    )}

                    {/* Row 3: Inline SL/TP edit strip (expands on tap) */}
                    {isEditOpen && (
                      <div style={{ borderTop: '1px solid var(--border-dim)', padding: '10px 10px 12px' }}>
                        {/* SL row */}
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: 700, color: 'var(--color-bear)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                            Stop Loss
                          </span>
                          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                            <button
                              style={{ minWidth: 40, height: 40, background: 'var(--bg-card)', border: '1px solid var(--border-dim)', color: 'var(--color-bear)', fontSize: 20, fontWeight: 300, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 0 }}
                              onClick={() => stepSl(-1)}
                            >−</button>
                            <input
                              type="number"
                              value={editSl}
                              onChange={e => setEditSl(e.target.value)}
                              placeholder={`e.g. ${(cur * (isShort ? 1.02 : 0.98)).toFixed(cur < 1 ? 5 : 2)}`}
                              style={{ flex: 1, height: 40, background: 'var(--bg-card)', border: '1px solid var(--border-dim)', color: 'var(--color-bear)', fontFamily: 'var(--font-mono)', fontSize: 13, textAlign: 'center', outline: 'none', borderRadius: 0, padding: '0 4px' }}
                            />
                            <button
                              style={{ minWidth: 40, height: 40, background: 'var(--bg-card)', border: '1px solid var(--border-dim)', color: 'var(--color-bear)', fontSize: 20, fontWeight: 300, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 0 }}
                              onClick={() => stepSl(1)}
                            >+</button>
                          </div>
                        </div>

                        {/* TP row */}
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: 700, color: 'var(--color-bull)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                            Take Profit
                          </span>
                          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                            <button
                              style={{ minWidth: 40, height: 40, background: 'var(--bg-card)', border: '1px solid var(--border-dim)', color: 'var(--color-bull)', fontSize: 20, fontWeight: 300, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 0 }}
                              onClick={() => stepTp(-1)}
                            >−</button>
                            <input
                              type="number"
                              value={editTp}
                              onChange={e => setEditTp(e.target.value)}
                              placeholder={`e.g. ${(cur * (isShort ? 0.98 : 1.02)).toFixed(cur < 1 ? 5 : 2)}`}
                              style={{ flex: 1, height: 40, background: 'var(--bg-card)', border: '1px solid var(--border-dim)', color: 'var(--color-bull)', fontFamily: 'var(--font-mono)', fontSize: 13, textAlign: 'center', outline: 'none', borderRadius: 0, padding: '0 4px' }}
                            />
                            <button
                              style={{ minWidth: 40, height: 40, background: 'var(--bg-card)', border: '1px solid var(--border-dim)', color: 'var(--color-bull)', fontSize: 20, fontWeight: 300, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 0 }}
                              onClick={() => stepTp(1)}
                            >+</button>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="row" style={{ gap: 6 }}>
                          <button
                            className="btn btn-bull"
                            style={{ flex: 1, fontSize: 11, fontWeight: 700, padding: '10px 0', letterSpacing: '0.04em' }}
                            onClick={confirmEdit}
                          >
                            CONFIRM
                          </button>
                          {(pos.stopLoss || pos.takeProfit) && (
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: 11, padding: '10px 14px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}
                              onClick={clearSLTP}
                            >
                              CLEAR
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Segmented Trade Panel: Order Book / 24H Stats / 1-Tap Trade */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <AssetTradePanel
                asset={selectedAsset}
                currentPrice={curPrice}
                candles={candles}
                account={engine.activeAccount}
                position={engine.positions.find(p => p.symbol === selectedAsset.symbol)}
                orders={engine.orders.filter(o => o.symbol === selectedAsset.symbol)}
                onMarketBuy={(qty) => engine.marketBuy(selectedAsset.symbol, qty, curPrice)}
                onMarketSell={(qty) => engine.marketSell(selectedAsset.symbol, qty, curPrice)}
                onClosePosition={engine.closePosition}
                onOpenFullTradeModal={() => setShowTradeModal(true)}
                onOpenStatsModal={() => setDetailAsset(selectedAsset)}
              />
            </div>
          </div>
        )}

        {/* MARKETS TAB */}
        {tab === 'markets' && (
          <Watchlist
            onSelectAsset={handleSelectAsset}
            selectedSymbol={selectedAsset.symbol}
            prices={prices}
            onPricesUpdate={handlePricesUpdate}
            onOpenDetail={(asset) => setDetailAsset(asset)}
          />
        )}

        {/* PORTFOLIO TAB */}
        {tab === 'portfolio' && (
          <div className="col" style={{ height: '100%', overflowY: 'auto' }}>
            <PortfolioChart
              history={engine.state.equityHistory[engine.state.activeAccountId] ?? []}
              account={engine.activeAccount}
              totalEquityUSD={totalEquityUSD}
            />
            <PortfolioBreakdown
              positions={engine.positions}
              prices={prices}
              account={engine.activeAccount}
              totalEquityUSD={totalEquityUSD}
            />
            <PnLCalendar
              history={engine.history}
              account={engine.activeAccount}
            />
            <PositionsList
              positions={engine.positions}
              orders={engine.orders}
              history={engine.history}
              prices={prices}
              account={engine.activeAccount}
              onClosePosition={engine.closePosition}
              onCancelOrder={engine.cancelOrder}
              onSelectAsset={handleSelectAsset}
              onUpdateSLTP={engine.updatePositionSLTP}
              onOpenAbout={() => { setAccountModalView('about'); setShowAccountModal(true); }}
            />
          </div>
        )}
        </main>
      </ErrorBoundary>

      {/* ── Bottom Navigation ───────────────────────────────────── */}
      <BottomNav
        active={tab}
        onChange={(newTab) => {
          if (newTab === 'accounts') {
            setAccountModalView('list');
            setShowAccountModal(true);
          } else {
            setTab(newTab);
          }
        }}
        openPositions={engine.positions.length}
      />

      {/* ── Trade Modal ─────────────────────────────────────────── */}
      {showTradeModal && curPrice > 0 && (
        <TradeModal
          asset={selectedAsset}
          currentPrice={curPrice}
          account={engine.activeAccount}
          positionQty={engine.positions.find(p => p.symbol === selectedAsset.symbol)?.quantity}
          onMarketBuy={(qty, sl, tp, lot) => engine.marketBuy(selectedAsset.symbol, qty, curPrice, sl, tp, lot)}
          onMarketSell={(qty, sl, tp, lot) => engine.marketSell(selectedAsset.symbol, qty, curPrice, sl, tp, lot)}
          onLimitOrder={(side, qty, price, lot) => engine.placeLimitOrder(selectedAsset.symbol, side, qty, price, lot)}
          onClose={() => setShowTradeModal(false)}
        />
      )}

      {/* ── Asset Detail Sheet / Modal ──────────────────────────── */}
      {detailAsset && (
        <AssetDetail
          asset={detailAsset}
          currentPrice={prices[detailAsset.symbol] ?? (detailAsset.symbol === selectedAsset.symbol ? curPrice : 0)}
          isFavourite={favorites.includes(detailAsset.symbol)}
          onToggleFavourite={() => toggleFavorite(detailAsset.symbol)}
          onGoToChart={() => {
            setSelectedAsset(detailAsset);
            setDetailAsset(null);
            setTab('trade');
          }}
          onClose={() => setDetailAsset(null)}
        />
      )}

      {/* ── Account Modal ───────────────────────────────────────── */}
      {showAccountModal && (
        <AccountModal
          accounts={engine.state.accounts}
          activeAccountId={engine.state.activeAccountId}
          state={engine.state}
          initialView={accountModalView}
          onSwitch={(id) => { engine.switchAccount(id); setLivePrice(null); }}
          onCreate={engine.createAccount}
          onTopUp={engine.topUpAccount}
          onReset={engine.resetAccount}
          onDelete={engine.deleteAccount}
          onUpdateCurrency={engine.updateAccountCurrency}
          onImport={handleImport}
          onOpenExport={() => setShowExportModal(true)}
          onOpenImport={() => setShowImportModal(true)}
          onClose={() => setShowAccountModal(false)}
        />
      )}

      {/* ── Export Modal ────────────────────────────────────────── */}
      {showExportModal && (
        <ExportModal
          state={engine.state}
          onSuccess={(path) => {
            addToast('Backup Exported', `Saved to ${path}`, 'success');
          }}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* ── Import Modal ────────────────────────────────────────── */}
      {showImportModal && (
        <ImportModal
          currentState={engine.state}
          onConfirmRestore={(restoredState, mode) => {
            engine.replaceState(restoredState);
            addToast(
              'Portfolio Restored',
              mode === 'merge' ? 'Accounts merged into your portfolio successfully!' : 'Portfolio overwritten with backup!',
              'success'
            );
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
