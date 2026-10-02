import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Star, BarChart2, ExternalLink } from 'lucide-react';
import type { Asset, Quote } from '../types/market';
import { formatAssetPrice } from '../utils/formatPrice';

interface AssetInfo {
  quote: Quote;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow:  number;
  marketCap:        number | null;
  avgVolume:        number | null;
  pe:               number | null;
  sector:           string | null;
}

interface NewsItem {
  title:       string;
  link:        string;
  pubDate:     string;
  source:      string;
}

interface Props {
  asset: Asset;
  currentPrice: number;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  onGoToChart: () => void;
  onClose: () => void;
}

async function fetchAssetInfo(symbol: string): Promise<AssetInfo | null> {
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const path = `/v8/finance/chart/${symbol}?interval=1d&range=1y`;
  const urls = [
    isDev ? `/api/yahoo${path}` : null,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com${path}`)}`,
    `https://query1.finance.yahoo.com${path}`,
  ].filter(Boolean) as string[];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const json = await res.json();
      const r = json?.chart?.result?.[0];
      const meta = r?.meta;
      if (!meta || !meta.regularMarketPrice) continue;
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const high52 = meta.fiftyTwoWeekHigh ?? (price * 1.25);
      const low52  = meta.fiftyTwoWeekLow  ?? (price * 0.85);

      return {
        quote: {
          symbol,
          price,
          change: price - prev,
          changePct: prev > 0 ? ((price - prev) / prev) * 100 : 0,
          high24h: meta.regularMarketDayHigh ?? price,
          low24h:  meta.regularMarketDayLow  ?? price,
          volume:  meta.regularMarketVolume  ?? 0,
          timestamp: Date.now(),
        },
        fiftyTwoWeekHigh: high52,
        fiftyTwoWeekLow:  low52,
        marketCap:        null,
        avgVolume:        null,
        pe:               null,
        sector:           null,
      };
    } catch {
      // try next
    }
  }
  return null;
}

async function fetchNews(query: string): Promise<NewsItem[]> {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' stock trading')}&hl=en-US&gl=US&ceid=US:en`;
  const url    = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&api_key=public&count=8`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.items ?? []).map((item: Record<string, string>) => ({
      title:   item.title ?? '',
      link:    item.link  ?? '',
      pubDate: item.pubDate ?? '',
      source:  item.author ?? 'News',
    }));
  } catch { return []; }
}

function fmtMktCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export function AssetDetail({ asset, currentPrice, isFavourite, onToggleFavourite, onGoToChart, onClose }: Props) {
  const [info, setInfo]     = useState<AssetInfo | null>(null);
  const [news, setNews]     = useState<NewsItem[]>([]);
  const [tab,  setTab]      = useState<'info' | 'news'>('info');
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    setInfo(null);
    setLoad(true);
    setNews([]);
    if (asset.class !== 'crypto') {
      fetchAssetInfo(asset.quoteSymbol).then(d => { setInfo(d); setLoad(false); });
    } else {
      setLoad(false);
    }
    fetchNews(asset.name).then(setNews);
  }, [asset]);

  const isUp      = info ? info.quote.changePct >= 0 : true;
  const price     = info?.quote.price ?? currentPrice;
  const pct52wPos = info
    ? ((price - info.fiftyTwoWeekLow) / (info.fiftyTwoWeekHigh - info.fiftyTwoWeekLow)) * 100
    : null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ padding: 0, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* ── Header ── */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: 'var(--bg-subtle)', border: '1px solid var(--border-mid)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                  color: asset.iconColor ?? 'var(--text-primary)',
                }}>
                  {asset.iconLetters.slice(0, 4)}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16 }}>
                    {asset.symbol.replace('.NS','').replace('USDT','')}
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                    {asset.name}
                    {info?.sector && <span style={{ color: 'var(--text-muted)' }}> · {info.sector}</span>}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24, letterSpacing: '-0.03em' }}>
                  {formatAssetPrice(price, asset.symbol)}
                </span>
                {info && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                    color: isUp ? 'var(--color-bull)' : 'var(--color-bear)',
                    padding: '3px 8px',
                    border: `1px solid ${isUp ? 'var(--color-bull)' : 'var(--color-bear)'}`,
                    background: isUp ? 'var(--bg-bull)' : 'var(--bg-bear)',
                  }}>
                    {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {isUp ? '+' : ''}{info.quote.changePct.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onToggleFavourite} style={{
                background: 'none', border: '1px solid var(--border-dim)',
                color: isFavourite ? '#f59e0b' : 'var(--text-muted)',
                cursor: 'pointer', padding: '6px 8px', borderRadius: 0,
              }}>
                <Star size={15} fill={isFavourite ? '#f59e0b' : 'none'} />
              </button>
              <button onClick={onClose} style={{
                background: 'none', border: '1px solid var(--border-dim)',
                color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 8px', borderRadius: 0,
              }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={onGoToChart} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: '#fff', border: '1px solid #fff', color: '#000',
              fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700,
              padding: '11px 0', cursor: 'pointer', borderRadius: 0,
            }}>
              <BarChart2 size={14} /> OPEN CHART & TRADE
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-dim)', flexShrink: 0 }}>
          {(['info', 'news'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid #fff' : '2px solid transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '10px 18px', cursor: 'pointer',
            }}>
              {t === 'info' ? 'Info' : `News${news.length > 0 ? ` (${news.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {tab === 'info' && (
            <>
              {loading && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>Loading info…</p>}

              {info && (
                <>
                  {/* 52-Week Range */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        52-Week Range
                      </span>
                    </div>
                    {/* Bar */}
                    <div style={{ background: 'var(--bg-subtle)', height: 4, borderRadius: 2, position: 'relative', marginBottom: 6 }}>
                      <div style={{
                        position: 'absolute', left: `${pct52wPos ?? 50}%`,
                        width: 10, height: 10, borderRadius: '50%',
                        background: isUp ? 'var(--color-bull)' : 'var(--color-bear)',
                        top: -3, transform: 'translateX(-50%)',
                        boxShadow: `0 0 6px ${isUp ? 'var(--color-bull)' : 'var(--color-bear)'}`,
                      }} />
                      <div style={{
                        background: 'linear-gradient(to right, var(--color-bear), var(--color-bull))',
                        height: '100%', borderRadius: 2,
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-bear)' }}>
                        {formatAssetPrice(info.fiftyTwoWeekLow, asset.symbol)}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-bull)' }}>
                        {formatAssetPrice(info.fiftyTwoWeekHigh, asset.symbol)}
                      </span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, border: '1px solid var(--border-dim)', marginBottom: 16 }}>
                    {[
                      { label: 'Market Cap',  value: info.marketCap ? fmtMktCap(info.marketCap) : '—' },
                      { label: 'P/E Ratio',   value: info.pe ? info.pe.toFixed(1) : '—' },
                      { label: 'Avg Volume',  value: info.avgVolume ? `${(info.avgVolume / 1e6).toFixed(1)}M` : '—' },
                      { label: '24h Volume',  value: `${(info.quote.volume / 1e6).toFixed(1)}M` },
                      { label: "Day's High",  value: formatAssetPrice(info.quote.high24h, asset.symbol) },
                      { label: "Day's Low",   value: formatAssetPrice(info.quote.low24h, asset.symbol) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: '12px 14px', borderRight: '1px solid var(--border-dim)', background: 'var(--bg-card)' }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                          {label}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Crypto — no Yahoo data */}
              {!loading && !info && (
                <div style={{ padding: '14px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)', marginBottom: 16 }}>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
                    Live crypto data streaming from Binance. Open the chart for full price history and trading.
                  </p>
                </div>
              )}
            </>
          )}

          {tab === 'news' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {news.length === 0 && (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>
                  Loading news…
                </p>
              )}
              {news.map((item, i) => (
                <a key={i} href={item.link} target="_blank" rel="noreferrer"
                  style={{
                    display: 'block', padding: '12px 0',
                    borderBottom: '1px solid var(--border-dim)',
                    textDecoration: 'none', color: 'inherit',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.45, marginBottom: 5 }}>
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-muted)' }}>
                      {new Date(item.pubDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <ExternalLink size={10} color="var(--text-muted)" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
