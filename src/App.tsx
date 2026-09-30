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
import { AssetDetail }      from './components/AssetDetail';
import { AccountModal }     from './components/AccountModal';
import { ToastContainer, type ToastMessage } from './components/Toast';

import { ASSETS, ASSET_MAP } from './data/assets';
import type { Asset, Timeframe } from './types/market';
import { formatCurrency, type AppState } from './services/storage';
import {
  fetchBinanceCandles, fetchCandles, fetchYahooQuote,
  subscribeLiveQuote, startSyntheticTicks,
} from './services/marketData';
import type { Candle } from './types/market';
import { Info, Download } from 'lucide-react';
import { formatAssetPrice } from './utils/formatPrice';

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

  const engine = useTradingEngine(addToast);
  const [tab, setTab] = useState<Tab>('trade');
  const [selectedAsset, setSelectedAsset] = useState<Asset>(DEFAULT_ASSET);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountModalView, setAccountModalView] = useState<'list' | 'create' | 'about'>('list');

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dailytrade_favorites');
      return saved ? JSON.parse(saved) : ['BTCUSDT', 'AAPL', 'RELIANCE.NS', 'GC=F'];
    } catch {
      return ['BTCUSDT', 'AAPL', 'RELIANCE.NS', 'GC=F'];
    }
  });

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev => {
      const next = prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol];
      try {
        localStorage.setItem('dailytrade_favorites', JSON.stringify(next));
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
    setPrices(prev => ({ ...prev, ...update }));
  }, []);

  // Load historical candles whenever asset or timeframe changes
  useEffect(() => {
    setLoading(true);
    setCandles([]);
    const isCrypto = selectedAsset.class === 'crypto';
    const loadCandles = isCrypto
      ? fetchBinanceCandles(selectedAsset.quoteSymbol, timeframe)
      : fetchCandles(selectedAsset.quoteSymbol, timeframe);

    loadCandles.then(data => {
      setCandles(data);
      setLoading(false);
    });
  }, [selectedAsset, timeframe]);

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
    }, 30_000);
    return () => clearInterval(equityTimerRef.current!);
  }, [prices, engine.recordEquity]);

  const totalEquityUSD = engine.calcEquity(prices);
  const unrPnLUSD = engine.calcUnrealisedPnL(prices);
  const curPrice = livePrice ?? prices[selectedAsset.symbol] ?? 0;

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setTab('trade');
  };

  const handleImport = (s: AppState) => {
    localStorage.setItem('dailytrade_v1', JSON.stringify(s));
    window.location.reload();
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
      <main className="app-content">
        {/* TRADE TAB */}
        {tab === 'trade' && (
          <div className="col" style={{ height: '100%' }}>
            <TradingViewChart
              symbol={selectedAsset.symbol.replace('.NS','').replace('USDT','')}
              name={selectedAsset.name}
              assetClass={selectedAsset.class}
              candles={candles}
              livePrice={livePrice}
              entryPrice={engine.positions.find(p => p.symbol === selectedAsset.symbol)?.entryPriceUSD}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              loading={loading}
              onBack={() => setTab('markets')}
            />

            {/* Asset info + Details + Trade button */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-dim)', background: 'var(--bg-card)' }}>
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

              {/* Open positions for this asset */}
              {engine.positions.filter(p => p.symbol === selectedAsset.symbol).map(pos => {
                const cur = prices[pos.symbol] ?? pos.entryPriceUSD;
                const pnl = (cur - pos.entryPriceUSD) * pos.quantity;
                const isUp = pnl >= 0;
                return (
                  <div key={pos.id} className="row between" style={{ padding: '8px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)', marginTop: 8 }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      LONG {pos.quantity.toFixed(pos.quantity < 1 ? 6 : 4)} @ {formatAssetPrice(pos.entryPriceUSD, pos.symbol)}
                    </span>
                    <div className="row gap-2">
                      <span className="num font-bold" style={{ fontSize: 12, color: isUp ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                        {isUp ? '+' : ''}{formatCurrency(pnl, engine.activeAccount.currency, true)}
                      </span>
                      <button
                        className="btn btn-bear"
                        style={{ fontSize: 10, padding: '3px 8px' }}
                        onClick={() => engine.closePosition(pos.id, cur)}
                      >
                        CLOSE
                      </button>
                    </div>
                  </div>
                );
              })}
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
              history={engine.state.equityHistory}
              account={engine.activeAccount}
              totalEquityUSD={totalEquityUSD}
            />
            <PortfolioBreakdown
              positions={engine.positions}
              prices={prices}
              account={engine.activeAccount}
              totalEquityUSD={totalEquityUSD}
            />
            <PositionsList
              positions={engine.positions}
              orders={engine.orders}
              history={engine.history}
              prices={prices}
              account={engine.activeAccount}
              onClosePosition={engine.closePosition}
              onCancelOrder={engine.cancelOrder}
              onOpenAbout={() => { setAccountModalView('about'); setShowAccountModal(true); }}
            />
          </div>
        )}
      </main>

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
          onMarketBuy={(qty, sl, tp) => engine.marketBuy(selectedAsset.symbol, qty, curPrice, sl, tp)}
          onLimitOrder={(side, qty, price) => engine.placeLimitOrder(selectedAsset.symbol, side, qty, price)}
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
          onSwitch={engine.switchAccount}
          onCreate={engine.createAccount}
          onTopUp={engine.topUpAccount}
          onReset={engine.resetAccount}
          onDelete={engine.deleteAccount}
          onUpdateCurrency={engine.updateAccountCurrency}
          onImport={handleImport}
          onClose={() => setShowAccountModal(false)}
        />
      )}
    </div>
  );
}
