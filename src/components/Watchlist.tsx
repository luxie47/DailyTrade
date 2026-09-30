import { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Star, Info } from 'lucide-react';
import { ASSETS } from '../data/assets';
import type { Asset, AssetClass, Quote } from '../types/market';
import { subscribeAllQuotes, fetchBatchYahooQuotes } from '../services/marketData';
import { Sparkline, syntheticSparkline } from './Sparkline';
import { formatAssetPrice } from '../utils/formatPrice';

type TabKey = AssetClass | 'all' | 'fav';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',          label: 'ALL' },
  { key: 'fav',          label: '★ STARRED' },
  { key: 'stock',        label: 'STOCKS' },
  { key: 'crypto',       label: 'CRYPTO' },
  { key: 'commodity',    label: 'COMMODITIES & OIL' },
  { key: 'forex',        label: 'FOREX & USD' },
  { key: 'fund',         label: 'MUTUAL FUNDS & ETFS' },
  { key: 'fixed-income', label: 'FD & BONDS' },
];

interface Props {
  onSelectAsset: (asset: Asset) => void;
  selectedSymbol: string;
  prices: Record<string, number>;
  onPricesUpdate: (prices: Record<string, number>) => void;
  onOpenDetail?: (asset: Asset) => void;
}

export function Watchlist({ onSelectAsset, selectedSymbol, prices, onPricesUpdate, onOpenDetail }: Props) {
  const [tab, setTab]       = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);

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
      const next = prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol];
      try {
        localStorage.setItem('dailytrade_favorites', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // ── Binance real-time for crypto ─────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeAllQuotes((q) => {
      setQuotes(prev => ({ ...prev, [q.symbol]: q }));
      onPricesUpdate({ [q.symbol]: q.price });
    });
    return unsub;
  }, [onPricesUpdate]);

  // ── Batch Yahoo Finance for all non-crypto at once ───────────────────────
  useEffect(() => {
    const nonCrypto = ASSETS.filter(a => a.class !== 'crypto');
    const symbols   = nonCrypto.map(a => a.quoteSymbol);

    fetchBatchYahooQuotes(symbols).then(results => {
      const priceMap: Record<string, number> = {};
      const quoteMap: Record<string, Quote>  = {};

      // Map back from quoteSymbol → asset.symbol
      for (const asset of nonCrypto) {
        const q = results[asset.quoteSymbol];
        if (q) {
          quoteMap[asset.symbol]  = { ...q, symbol: asset.symbol };
          priceMap[asset.symbol]  = q.price;
        }
      }
      setQuotes(prev => ({ ...prev, ...quoteMap }));
      onPricesUpdate(priceMap);
      setLoading(false);
    });
  }, [onPricesUpdate]);

  const filtered = ASSETS.filter(a => {
    let matchTab = true;
    if (tab === 'fav') {
      matchTab = favorites.includes(a.symbol);
    } else if (tab !== 'all') {
      matchTab = a.class === tab;
    }

    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.symbol.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const formatPrice = (price: number) =>
    price < 0.01  ? price.toFixed(6)
    : price < 1   ? price.toFixed(4)
    : price < 100 ? price.toFixed(2)
    : price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Search Bar ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderBottom: '1px solid var(--border-dim)',
        background: 'var(--bg-canvas)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Search size={15} color="var(--text-muted)" strokeWidth={1.5} />
        <input
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-primary)', flex: 1, outline: 'none',
            fontFamily: 'var(--font-ui)', fontSize: 13,
          }}
          placeholder="Search 120+ assets across stocks, crypto, oil, forex, funds…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-dim)', overflowX: 'auto', background: 'var(--bg-card)' }}>
        {TABS.map(t => {
          const isSelected = tab === t.key;
          const count = t.key === 'fav' ? favorites.length : undefined;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: 'none', border: 'none',
                borderBottom: isSelected ? '2px solid #fff' : '2px solid transparent',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.06em', padding: '10px 14px',
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'color 0.1s, border-color 0.1s',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              {t.label}
              {count !== undefined && count > 0 && (
                <span style={{
                  fontSize: 9,
                  background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
                  padding: '1px 5px',
                  borderRadius: 10,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Header row ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', padding: '6px 14px',
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border-dim)',
        alignItems: 'center',
      }}>
        <span style={{ width: 28, textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          ★
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          ASSET
        </span>
        <span style={{ width: 64, textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          TREND
        </span>
        <span style={{ minWidth: 80, fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>
          PRICE
        </span>
        <span style={{ minWidth: 64, fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>
          24H
        </span>
      </div>

      {/* ── Asset List ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: 8, color: 'var(--text-muted)' }}>
            <Search size={22} strokeWidth={1.5} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13 }}>
              {tab === 'fav' ? 'No starred assets yet. Click the star ★ icon on any asset to add.' : 'No assets found'}
            </span>
          </div>
        )}

        {filtered.map(asset => {
          const q          = quotes[asset.symbol];
          const price      = prices[asset.symbol] ?? q?.price;
          const changePct  = q?.changePct ?? 0;
          const isUp       = changePct >= 0;
          const isSelected = asset.symbol === selectedSymbol;
          const isCrypto   = asset.class === 'crypto';
          const hasPrice   = price != null;
          const isFav      = favorites.includes(asset.symbol);

          return (
            <div
              key={asset.symbol}
              onClick={() => onSelectAsset(asset)}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-dim)',
                background: isSelected ? 'var(--bg-hover)' : 'transparent',
                borderLeft: isSelected ? '2px solid #fff' : '2px solid transparent',
                cursor: 'pointer', transition: 'background 0.1s',
                gap: 8,
              }}
            >
              {/* Star Favourite button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(asset.symbol);
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isFav ? 'var(--color-gold)' : 'var(--text-muted)',
                  flexShrink: 0,
                }}
                title={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <Star size={14} fill={isFav ? 'var(--color-gold)' : 'transparent'} strokeWidth={1.5} />
              </button>

              {/* Icon badge */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                border: `1px solid ${asset.iconColor ? asset.iconColor + '44' : 'var(--border-mid)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                color: asset.iconColor ?? 'var(--text-primary)',
                background: 'var(--bg-subtle)', flexShrink: 0,
                letterSpacing: '-0.02em',
              }}>
                {asset.iconLetters.slice(0, 4)}
              </div>

              {/* Name + symbol */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, lineHeight: 1 }}>
                    {asset.symbol.replace('.NS', '').replace('USDT', '')}
                  </span>
                  {onOpenDetail && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetail(asset);
                      }}
                      title="View Asset Details & News"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 0, color: 'var(--text-muted)', display: 'inline-flex',
                      }}
                    >
                      <Info size={12} />
                    </button>
                  )}
                </div>
                <span style={{
                  fontSize: 11, color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-ui)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {asset.name}
                </span>
              </div>

              {/* Sparkline mini-chart */}
              <div style={{ width: 64, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                {hasPrice ? (
                  <Sparkline
                    prices={syntheticSparkline(price!, changePct, 16)}
                    isUp={isUp}
                    width={60}
                    height={24}
                  />
                ) : (
                  <div style={{ width: 60, height: 24 }} />
                )}
              </div>

              {/* Price */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, minWidth: 80 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
                  fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                }}>
                  {hasPrice ? formatAssetPrice(price!, asset.symbol) : (
                    isCrypto ? '…' : loading ? '…' : '—'
                  )}
                </span>
              </div>

              {/* 24h change */}
              <div style={{ minWidth: 64, display: 'flex', justifyContent: 'flex-end' }}>
                {q ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 2,
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                    color: isUp ? 'var(--color-bull)' : 'var(--color-bear)',
                    padding: '2px 5px',
                    border: `1px solid ${isUp ? 'var(--color-bull)' : 'var(--color-bear)'}`,
                    background: isUp ? 'var(--bg-bull)' : 'var(--bg-bear)',
                    letterSpacing: '-0.02em',
                  }}>
                    {isUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                    {isUp ? '+' : ''}{changePct.toFixed(1)}%
                  </span>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
