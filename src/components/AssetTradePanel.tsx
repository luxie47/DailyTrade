import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Zap, BarChart2, DollarSign, Layers } from 'lucide-react';
import type { Asset, Candle } from '../types/market';
import type { Account } from '../types/account';
import type { Position, Order } from '../types/trade';
import { formatCurrency, formatPct } from '../services/storage';
import { formatAssetPrice, getAssetUSDMultiplier } from '../utils/formatPrice';

interface Props {
  asset: Asset;
  currentPrice: number;
  candles: Candle[];
  account: Account;
  position?: Position;
  orders: Order[];
  onMarketBuy: (qty: number) => void;
  onMarketSell: (qty: number) => void;
  onClosePosition: (posId: string, price: number) => void;
  onOpenFullTradeModal: () => void;
  onOpenStatsModal: () => void;
}

type SubTab = 'orderbook' | 'stats' | 'quicktrade';

export function AssetTradePanel({
  asset,
  currentPrice,
  candles,
  account,
  position,
  orders,
  onMarketBuy,
  onClosePosition,
  onOpenFullTradeModal,
  onOpenStatsModal,
}: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>('orderbook');
  const [quickAmountUSD, setQuickAmountUSD] = useState<string>('500');

  // Compute 24h stats from available candle history
  const stats24h = useMemo(() => {
    if (candles.length === 0) {
      return {
        high: currentPrice * 1.025,
        low: currentPrice * 0.975,
        changePct: 0.85,
        volume: 42150,
      };
    }
    const recent = candles.slice(-24);
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);
    const high = Math.max(...highs, currentPrice);
    const low = Math.min(...lows, currentPrice);
    const firstClose = recent[0]?.open ?? currentPrice;
    const changePct = firstClose > 0 ? ((currentPrice - firstClose) / firstClose) * 100 : 0;
    const volume = recent.reduce((sum, c) => sum + (c.volume || 1000), 0);
    return { high, low, changePct, volume };
  }, [candles, currentPrice]);

  // Generate realistic live order book depth based on current price
  const orderBook = useMemo(() => {
    if (!currentPrice || currentPrice <= 0) return { asks: [], bids: [], spread: 0 };
    const step = currentPrice * 0.0006;
    const asks: { price: number; size: number; total: number; depthPct: number }[] = [];
    const bids: { price: number; size: number; total: number; depthPct: number }[] = [];

    let cumAsk = 0;
    for (let i = 5; i >= 1; i--) {
      const p = currentPrice + i * step;
      const size = Number((Math.sin(p * 10 + i) * 0.8 + 1.2).toFixed(4));
      cumAsk += size;
      asks.push({ price: p, size, total: cumAsk, depthPct: 0 });
    }
    const maxAskTotal = cumAsk || 1;
    asks.forEach(a => { a.depthPct = Math.min(100, Math.round((a.total / maxAskTotal) * 100)); });

    let cumBid = 0;
    for (let i = 1; i <= 5; i++) {
      const p = currentPrice - i * step;
      const size = Number((Math.cos(p * 10 + i) * 0.8 + 1.2).toFixed(4));
      cumBid += size;
      bids.push({ price: p, size, total: cumBid, depthPct: 0 });
    }
    const maxBidTotal = cumBid || 1;
    bids.forEach(b => { b.depthPct = Math.min(100, Math.round((b.total / maxBidTotal) * 100)); });

    const spread = asks[asks.length - 1]?.price - bids[0]?.price;
    return { asks, bids, spread: Math.max(spread, step) };
  }, [currentPrice]);

  // Quick trade calculations
  const maxCash = Math.max(0, account.cashUSD);
  const handleQuickPercent = (pct: number) => {
    const val = (maxCash * pct).toFixed(0);
    setQuickAmountUSD(val);
  };

  const handleExecuteQuickBuy = () => {
    const usd = parseFloat(quickAmountUSD);
    if (!usd || usd <= 0 || !currentPrice || currentPrice <= 0) return;
    const priceUSD = currentPrice * getAssetUSDMultiplier(asset.symbol);
    const qty = usd / priceUSD;
    onMarketBuy(qty);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderTop: '1px solid var(--border-dim)', minHeight: 220 }}>
      {/* ── Segmented Tab Header ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-subtle)' }}>
        {[
          { key: 'orderbook', label: 'ORDER BOOK', icon: Layers },
          { key: 'stats', label: '24H STATS', icon: BarChart2 },
          { key: 'quicktrade', label: '1-TAP TRADE', icon: Zap },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as SubTab)}
              style={{
                flex: 1,
                padding: '9px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                background: isActive ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #ffffff' : '2px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, padding: '10px 14px', overflowY: 'auto' }}>
        {/* TAB 1: ORDER BOOK */}
        {activeTab === 'orderbook' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Table Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.06em' }}>
              <span>PRICE ({asset.quoteSymbol ? 'USD' : 'USDT'})</span>
              <span>SIZE</span>
              <span>DEPTH</span>
            </div>

            {/* Asks (Sells - Red) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {orderBook.asks.map((a, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    padding: '2px 4px',
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                  title="Click to use price"
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: `${a.depthPct}%`,
                      background: 'rgba(255, 61, 113, 0.12)',
                      pointerEvents: 'none',
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ color: 'var(--color-bear)', fontWeight: 600 }}>
                    {formatAssetPrice(a.price, asset.symbol)}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{a.size.toFixed(3)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 9.5 }}>{a.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Current Price & Spread Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '5px 8px',
                margin: '3px 0',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-dim)',
                borderRadius: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: stats24h.changePct >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                  {formatAssetPrice(currentPrice, asset.symbol)}
                </span>
                <span style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {stats24h.changePct >= 0 ? '▲' : '▼'} {formatPct(stats24h.changePct)}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)' }}>
                Spread: {formatAssetPrice(orderBook.spread, asset.symbol)}
              </span>
            </div>

            {/* Bids (Buys - Green) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {orderBook.bids.map((b, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    padding: '2px 4px',
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                  title="Click to use price"
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: `${b.depthPct}%`,
                      background: 'rgba(0, 230, 118, 0.12)',
                      pointerEvents: 'none',
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ color: 'var(--color-bull)', fontWeight: 600 }}>
                    {formatAssetPrice(b.price, asset.symbol)}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{b.size.toFixed(3)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 9.5 }}>{b.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: 24H STATS */}
        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <div style={{ padding: '8px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>24H HIGH</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--color-bull)', marginTop: 2 }}>
                  {formatAssetPrice(stats24h.high, asset.symbol)}
                </div>
              </div>
              <div style={{ padding: '8px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>24H LOW</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--color-bear)', marginTop: 2 }}>
                  {formatAssetPrice(stats24h.low, asset.symbol)}
                </div>
              </div>
              <div style={{ padding: '8px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>24H CHANGE</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: stats24h.changePct >= 0 ? 'var(--color-bull)' : 'var(--color-bear)', marginTop: 2 }}>
                  {stats24h.changePct >= 0 ? '+' : ''}{stats24h.changePct.toFixed(2)}%
                </div>
              </div>
              <div style={{ padding: '8px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>24H VOLUME</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                  {stats24h.volume.toLocaleString()}
                </div>
              </div>
            </div>

            {/* 24h Price Range Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)' }}>
                <span>Low: {formatAssetPrice(stats24h.low, asset.symbol)}</span>
                <span>24H PRICE RANGE</span>
                <span>High: {formatAssetPrice(stats24h.high, asset.symbol)}</span>
              </div>
              <div style={{ height: 6, width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${Math.min(100, Math.max(5, ((currentPrice - stats24h.low) / Math.max(1, stats24h.high - stats24h.low)) * 100))}%`,
                    background: 'linear-gradient(90deg, var(--color-bear), var(--color-bull))',
                  }}
                />
              </div>
            </div>

            <button
              className="btn btn-outline"
              style={{ fontSize: 11, padding: '7px 0', width: '100%' }}
              onClick={onOpenStatsModal}
            >
              MORE FUNDAMENTALS &amp; NEWS ↗
            </button>
          </div>
        )}

        {/* TAB 3: QUICK 1-TAP TRADE */}
        {activeTab === 'quicktrade' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Active Position Info if held */}
            {position && (
              <div style={{ padding: '8px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)', borderRadius: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="badge badge-neutral" style={{ fontSize: 9 }}>ACTIVE LONG</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {position.quantity.toFixed(position.quantity < 1 ? 4 : 2)} units
                    </span>
                  </div>
                  <button
                    className="btn btn-bear"
                    style={{ fontSize: 10, padding: '3px 8px' }}
                    onClick={() => onClosePosition(position.id, currentPrice)}
                  >
                    CLOSE NOW
                  </button>
                </div>
              </div>
            )}

            {/* Available Balance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)' }}>Available Cash:</span>
              <span style={{ fontWeight: 700 }}>
                {formatCurrency(maxCash, account.currency)}
              </span>
            </div>

            {/* Quick Amount Selector */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[0.1, 0.25, 0.5, 1.0].map(pct => (
                <button
                  key={pct}
                  type="button"
                  className="btn btn-outline flex-1"
                  style={{ fontSize: 10, padding: '5px 0' }}
                  onClick={() => handleQuickPercent(pct)}
                >
                  {pct === 1.0 ? 'MAX' : `${pct * 100}%`}
                </button>
              ))}
            </div>

            {/* Amount input & 1-tap Buy */}
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  className="input"
                  type="number"
                  placeholder="Amount in USD"
                  value={quickAmountUSD}
                  onChange={e => setQuickAmountUSD(e.target.value)}
                  style={{ width: '100%', fontSize: 12, paddingLeft: 22 }}
                />
                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>$</span>
              </div>
              <button
                className="btn btn-bull"
                style={{ fontSize: 11, padding: '8px 16px', fontWeight: 700, flexShrink: 0 }}
                onClick={handleExecuteQuickBuy}
              >
                1-TAP BUY
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              <span>Est. Qty: {currentPrice > 0 ? ((parseFloat(quickAmountUSD) || 0) / (currentPrice * getAssetUSDMultiplier(asset.symbol))).toFixed(4) : '0'}</span>
              <button
                type="button"
                onClick={onOpenFullTradeModal}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Advanced Order (SL/TP) →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
