import { TrendingUp, TrendingDown, Clock, BarChart2, X, Star, Heart, Info, ExternalLink, Download } from 'lucide-react';
import type { Position, ClosedTrade, Order } from '../types/trade';
import type { Account } from '../types/account';
import { formatCurrency, formatPct } from '../services/storage';
import { formatAssetPrice } from '../utils/formatPrice';
import { ASSET_MAP } from '../data/assets';

interface Props {
  positions: Position[];
  orders: Order[];
  history: ClosedTrade[];
  prices: Record<string, number>;
  account: Account;
  onClosePosition: (posId: string, price: number) => void;
  onCancelOrder?: (orderId: string) => void;
  onOpenAbout?: () => void;
}

export function PositionsList({ positions, orders, history, prices, account, onClosePosition, onCancelOrder, onOpenAbout }: Props) {
  const totalUnrPnL = positions.reduce((sum, p) => {
    const cur = prices[p.symbol] ?? p.entryPriceUSD;
    return sum + (cur - p.entryPriceUSD) * p.quantity;
  }, 0);
  const totalRealPnL = history.reduce((sum, h) => sum + h.realizedPnLUSD, 0);
  const winTrades = history.filter(h => h.realizedPnLUSD > 0).length;
  const winRate = history.length > 0 ? (winTrades / history.length) * 100 : 0;

  return (
    <div className="col" style={{ height: '100%', overflowY: 'auto' }}>
      {/* Stats row */}
      <div className="row" style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-card)' }}>
        {[
          { label: 'UNREALISED', value: formatCurrency(totalUnrPnL, account.currency, true), up: totalUnrPnL >= 0 },
          { label: 'REALISED',   value: formatCurrency(totalRealPnL, account.currency, true), up: totalRealPnL >= 0 },
          { label: 'WIN RATE',   value: `${winRate.toFixed(0)}%`, up: winRate > 50 },
        ].map(s => (
          <div key={s.label} className="col" style={{ flex: 1, alignItems: 'center', padding: '10px 4px', borderRight: '1px solid var(--border-dim)' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {s.label}
            </span>
            <span className="num font-bold" style={{ fontSize: 13, color: s.up ? 'var(--color-bull)' : 'var(--color-bear)', marginTop: 2 }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Open Positions */}
      <div style={{ padding: '10px 12px 4px' }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          OPEN POSITIONS ({positions.length})
        </span>
      </div>
      {positions.length === 0 && (
        <div className="empty-state" style={{ paddingTop: 24 }}>
          <BarChart2 size={24} />
          <span>No open positions</span>
          <span style={{ color: 'var(--text-muted)' }}>Go to Markets tab to place a trade</span>
        </div>
      )}
      {positions.map(pos => {
        const curPrice = prices[pos.symbol] ?? pos.entryPriceUSD;
        const pnlUSD = (curPrice - pos.entryPriceUSD) * pos.quantity;
        const pnlPct = ((curPrice - pos.entryPriceUSD) / pos.entryPriceUSD) * 100;
        const isUp = pnlUSD >= 0;
        const asset = ASSET_MAP[pos.symbol];

        return (
          <div key={pos.id} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-canvas)' }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <div className="col" style={{ gap: 2 }}>
                <div className="row gap-2">
                  <span className="mono font-bold" style={{ fontSize: 13 }}>
                    {pos.symbol.replace('.NS','').replace('USDT','')}
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: 9 }}>LONG</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                  {pos.quantity.toFixed(pos.quantity < 1 ? 6 : 4)} units @ {formatAssetPrice(pos.entryPriceUSD, pos.symbol)}
                </span>
              </div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
                <span
                  className="num font-bold"
                  style={{ fontSize: 14, color: isUp ? 'var(--color-bull)' : 'var(--color-bear)' }}
                >
                  {isUp ? '+' : ''}{formatCurrency(pnlUSD, account.currency, true)}
                </span>
                <span
                  className="badge"
                  style={{
                    color: isUp ? 'var(--color-bull)' : 'var(--color-bear)',
                    borderColor: isUp ? 'var(--color-bull)' : 'var(--color-bear)',
                    background: isUp ? 'var(--bg-bull)' : 'var(--bg-bear)',
                    fontSize: 9,
                  }}
                >
                  {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {formatPct(pnlPct)}
                </span>
              </div>
            </div>
            <div className="row between">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                Current: {formatAssetPrice(curPrice, pos.symbol)}
              </span>
              <button
                className="btn btn-bear"
                style={{ fontSize: 10, padding: '4px 10px' }}
                onClick={() => onClosePosition(pos.id, curPrice)}
              >
                CLOSE
              </button>
            </div>
          </div>
        );
      })}

      {/* Pending Limit Orders */}
      {orders.length > 0 && (
        <>
          <div style={{ padding: '10px 12px 4px', borderTop: '1px solid var(--border-dim)', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              PENDING ORDERS ({orders.length})
            </span>
          </div>
          {orders.map(o => (
            <div key={o.id} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={12} color="var(--text-muted)" />
              <span className="mono" style={{ fontSize: 11, flex: 1 }}>
                {o.side.toUpperCase()} {o.symbol.replace('.NS','').replace('USDT','')} @ {formatAssetPrice(o.limitPrice ?? 0, o.symbol)} × {o.quantity}
              </span>
              <span className="badge badge-neutral" style={{ fontSize: 9 }}>PENDING</span>
              {onCancelOrder && (
                <button
                  type="button"
                  onClick={() => onCancelOrder(o.id)}
                  title="Cancel order"
                  style={{
                    background: 'none', border: '1px solid var(--border-dim)',
                    color: 'var(--color-bear)', cursor: 'pointer', padding: '2px 6px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {/* Trade History */}
      <div style={{ padding: '10px 12px 4px', borderTop: '1px solid var(--border-dim)', marginTop: 4 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          TRADE HISTORY ({history.length})
        </span>
      </div>
      {history.length === 0 && (
        <div style={{ padding: '12px 16px' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>No closed trades yet.</span>
        </div>
      )}
      {history.slice(0, 50).map(h => {
        const isUp = h.realizedPnLUSD >= 0;
        return (
          <div key={h.id} className="row between" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-dim)' }}>
            <div className="col" style={{ gap: 2 }}>
              <span className="mono font-bold" style={{ fontSize: 12 }}>
                {h.symbol.replace('.NS','').replace('USDT','')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                {new Date(h.exitTime).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
              </span>
            </div>
            <span
              className="num font-bold"
              style={{ fontSize: 13, color: isUp ? 'var(--color-bull)' : 'var(--color-bear)' }}
            >
              {isUp ? '+' : ''}{formatCurrency(h.realizedPnLUSD, account.currency, true)}
            </span>
          </div>
        );
      })}

      {/* ── Open Source & Community Section ── */}
      <div style={{ margin: '16px 12px 24px', padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
        <div className="row between" style={{ alignItems: 'center', marginBottom: 8 }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Star size={14} color="#f59e0b" fill="#f59e0b" />
            <span className="mono font-bold" style={{ fontSize: 11, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
              OPEN SOURCE SIMULATOR
            </span>
          </div>
          <span className="badge badge-neutral" style={{ fontSize: 9 }}>100% FREE</span>
        </div>

        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45, margin: '0 0 10px' }}>
          We are open sourcing DailyTrade mentally and freely for everyone! If you find value in this app, <strong>please star our repository on GitHub</strong> — it means the world to our development.
        </p>

        <div className="row gap-2" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
          <a
            href="https://github.com/luxie47/DailyTrade"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
            style={{ fontSize: 11, padding: '7px 10px', textDecoration: 'none', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)' }}
          >
            <Star size={12} fill="#fbbf24" /> STAR ON GITHUB
          </a>
          <a
            href="https://dailyflow-luxie.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
            style={{ fontSize: 11, padding: '7px 10px', textDecoration: 'none', color: '#a5b4fc', borderColor: 'rgba(99, 102, 241, 0.4)' }}
          >
            <Heart size={12} color="#818cf8" /> VISIT DAILYFLOW
          </a>
          <a
            href="https://discord.com/users/1205116665059090454"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
            style={{ fontSize: 11, padding: '7px 10px', textDecoration: 'none', color: '#bbc1f9', borderColor: 'rgba(88, 101, 242, 0.4)' }}
          >
            💬 DISCORD
          </a>
          <a
            href="https://github.com/luxie47/DailyTrade/releases/latest/download/DailyTrade.apk"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
            style={{ fontSize: 11, padding: '7px 10px', textDecoration: 'none', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.4)' }}
          >
            <Download size={12} color="#34d399" /> ANDROID APK
          </a>
          <a
            href="https://buymeachai.ezee.li/luxie47"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
            style={{ fontSize: 11, padding: '7px 10px', textDecoration: 'none', color: '#fb923c', borderColor: 'rgba(251, 146, 60, 0.4)' }}
          >
            🍵 BUY ME A CHAI
          </a>
          {onOpenAbout && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '7px 10px' }}
              onClick={onOpenAbout}
            >
              <Info size={12} /> ABOUT & PRIVACY
            </button>
          )}
        </div>

        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)' }}>
          Developer: Luxie47 (luxiee47@gmail.com | Discord: Luxie47) • Educational simulator only.
        </span>
      </div>
    </div>
  );
}
