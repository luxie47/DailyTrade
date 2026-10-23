import { useState } from 'react';
import { TrendingUp, TrendingDown, Clock, BarChart2, X, Star, Heart, Info, ExternalLink, Download, Shield, Target, AlertTriangle } from 'lucide-react';
import type { Position, ClosedTrade, Order } from '../types/trade';
import type { Account } from '../types/account';
import type { Asset } from '../types/market';
import { formatCurrency, formatPct } from '../services/storage';
import { formatAssetPrice, getAssetUSDMultiplier } from '../utils/formatPrice';
import { calculateLiveAccountMetrics } from '../core/portfolio/calculations';
import { ASSET_MAP, ASSETS } from '../data/assets';

interface Props {
  positions: Position[];
  orders: Order[];
  history: ClosedTrade[];
  prices: Record<string, number>;
  account: Account;
  onClosePosition: (posId: string, price: number) => void;
  onCancelOrder?: (orderId: string) => void;
  onOpenAbout?: () => void;
  onSelectAsset?: (asset: Asset) => void;
  onUpdateSLTP?: (posId: string, sl?: number, tp?: number) => void;
}

export function PositionsList({ positions, orders, history, prices, account, onClosePosition, onCancelOrder, onOpenAbout, onSelectAsset, onUpdateSLTP }: Props) {
  const [sltpPos, setSltpPos] = useState<Position | null>(null);
  const [modalSl, setModalSl] = useState('');
  const [modalTp, setModalTp] = useState('');
  const metrics = calculateLiveAccountMetrics(account.cashUSD, positions, prices);
  const totalRealPnL = history.reduce((sum, h) => sum + h.realizedPnLUSD, 0);
  const winTrades = history.filter(h => h.realizedPnLUSD > 0).length;
  const winRate = history.length > 0 ? (winTrades / history.length) * 100 : 0;

  const handleOpenStock = (symbol: string) => {
    if (!onSelectAsset) return;
    const clean = symbol.replace('.NS', '').replace('USDT', '');
    const asset =
      ASSET_MAP[symbol] ||
      ASSETS.find(a =>
        a.symbol === symbol ||
        a.quoteSymbol === symbol ||
        a.symbol.replace('USDT', '') === clean ||
        a.symbol.replace('.NS', '') === clean
      );
    if (asset) {
      onSelectAsset(asset);
    }
  };

  return (
    <div className="col">
      {/* Live Account Information HUD */}
      <div style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-card)' }}>
        {/* Tier 1: Real-Time Financials */}
        <div className="row" style={{ borderBottom: '1px solid var(--border-dim)' }}>
          <div className="col" style={{ flex: 1, alignItems: 'center', padding: '9px 4px', borderRight: '1px solid var(--border-dim)' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              BALANCE
            </span>
            <span className="mono font-bold" style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>
              {formatCurrency(metrics.balanceUSD, account.currency)}
            </span>
          </div>
          <div className="col" style={{ flex: 1, alignItems: 'center', padding: '9px 4px', borderRight: '1px solid var(--border-dim)' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              EQUITY
            </span>
            <span className="mono font-bold" style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>
              {formatCurrency(metrics.equityUSD, account.currency)}
            </span>
          </div>
          <div className="col" style={{ flex: 1, alignItems: 'center', padding: '9px 4px' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              FLOATING P&L
            </span>
            <span className="mono font-bold" style={{ fontSize: 13, color: metrics.unrealizedPnLUSD >= 0 ? 'var(--color-bull)' : 'var(--color-bear)', marginTop: 2 }}>
              {metrics.unrealizedPnLUSD >= 0 ? '+' : ''}{formatCurrency(metrics.unrealizedPnLUSD, account.currency, true)}
            </span>
          </div>
        </div>

        {/* Tier 2: Real-Time Margin & Health Indicators */}
        <div className="row">
          <div className="col" style={{ flex: 1, alignItems: 'center', padding: '7px 4px', borderRight: '1px solid var(--border-dim)', minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600, letterSpacing: '0.03em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>
              USED MARGIN
            </span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              {formatCurrency(metrics.usedMarginUSD, account.currency)}
            </span>
          </div>
          <div className="col" style={{ flex: 1, alignItems: 'center', padding: '7px 4px', borderRight: '1px solid var(--border-dim)', minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600, letterSpacing: '0.03em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>
              FREE MARGIN
            </span>
            <span className="mono font-bold" style={{ fontSize: 11, color: metrics.freeMarginUSD > 0 ? 'var(--text-primary)' : 'var(--color-bear)', marginTop: 1 }}>
              {formatCurrency(metrics.freeMarginUSD, account.currency)}
            </span>
          </div>
          <div className="col" style={{ flex: 1, alignItems: 'center', padding: '7px 4px', minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600, letterSpacing: '0.03em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>
              MARGIN LEVEL
            </span>
            <span
              className="mono font-bold"
              style={{
                fontSize: 11,
                color: metrics.usedMarginUSD <= 0
                  ? 'var(--text-muted)'
                  : metrics.marginLevelPct > 200
                    ? 'var(--color-bull)'
                    : metrics.marginLevelPct > 100
                      ? 'var(--color-gold)'
                      : 'var(--color-bear)',
                marginTop: 1,
              }}
            >
              {metrics.usedMarginUSD > 0 ? `${metrics.marginLevelPct.toFixed(0)}%` : '—'}
            </span>
          </div>
        </div>
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
        const hasLive = prices[pos.symbol] != null;
        const curPrice = prices[pos.symbol] ?? pos.entryPriceUSD;
        const isShort = pos.side === 'short';
        const mult = getAssetUSDMultiplier(pos.symbol);
        const priceDiff = isShort ? (pos.entryPriceUSD - curPrice) : (curPrice - pos.entryPriceUSD);
        const pnlUSD = priceDiff * pos.quantity * mult;
        const pnlPct = pos.entryPriceUSD > 0 ? (priceDiff / pos.entryPriceUSD) * 100 : 0;
        const isUp = pnlUSD >= 0;
        const asset = ASSET_MAP[pos.symbol];

        return (
          <div
            key={pos.id}
            onClick={() => handleOpenStock(pos.symbol)}
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-dim)',
              background: 'var(--bg-canvas)',
              cursor: onSelectAsset ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
            title={onSelectAsset ? `Click to open ${pos.symbol} in Trade tab` : undefined}
          >
            <div className="row between" style={{ marginBottom: 8 }}>
              <div className="col" style={{ gap: 2 }}>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <span className="mono font-bold" style={{ fontSize: 13, textDecoration: onSelectAsset ? 'underline' : 'none', textUnderlineOffset: 3 }}>
                    {pos.symbol.replace('.NS','').replace('USDT','')}
                  </span>
                  <span className={`badge ${pos.side === 'short' ? 'badge-bear' : 'badge-neutral'}`} style={{ fontSize: 9 }}>
                    {pos.side === 'short' ? 'SHORT' : 'LONG'}
                  </span>
                  {pos.lot != null && (
                    <span className="badge badge-neutral" style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}>
                      {pos.lot.toFixed(2)} LOT
                    </span>
                  )}
                  {onSelectAsset && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>↗</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                  {pos.lot != null ? `${pos.lot.toFixed(2)} Lot (${pos.quantity.toLocaleString()} units)` : `${pos.quantity.toFixed(pos.quantity < 1 ? 6 : 4)} units`} @ {formatAssetPrice(pos.entryPriceUSD, pos.symbol)}
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
            <div className="row between" style={{ alignItems: 'center' }}>
              <div className="col gap-1">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                  Current: {formatAssetPrice(curPrice, pos.symbol)} {!hasLive && <span style={{ fontSize: 9, opacity: 0.6 }}>(syncing)</span>}
                </span>
                {(pos.stopLoss || pos.takeProfit) && (
                  <div className="row gap-1" style={{ fontSize: 9 }}>
                    {pos.stopLoss && (
                      <span className="badge" style={{ color: 'var(--color-bear)', background: 'var(--bg-bear)', border: '1px solid var(--color-bear)', padding: '1px 5px', fontSize: 9 }}>
                        SL: {formatAssetPrice(pos.stopLoss, pos.symbol)}
                      </span>
                    )}
                    {pos.takeProfit && (
                      <span className="badge" style={{ color: 'var(--color-bull)', background: 'var(--bg-bull)', border: '1px solid var(--color-bull)', padding: '1px 5px', fontSize: 9 }}>
                        TP: {formatAssetPrice(pos.takeProfit, pos.symbol)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="row gap-2">
                {onUpdateSLTP && (
                  <button
                    className="btn"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      padding: '4px 9px',
                      height: 26,
                      background: (pos.stopLoss || pos.takeProfit)
                        ? 'rgba(0, 230, 118, 0.12)'
                        : 'rgba(255, 255, 255, 0.08)',
                      border: (pos.stopLoss || pos.takeProfit)
                        ? '1px solid rgba(0, 230, 118, 0.45)'
                        : '1px solid var(--border-mid)',
                      color: (pos.stopLoss || pos.takeProfit)
                        ? 'var(--color-bull)'
                        : 'var(--text-primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                      transition: 'all 0.12s ease',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSltpPos(pos);
                      setModalSl(pos.stopLoss ? pos.stopLoss.toString() : '');
                      setModalTp(pos.takeProfit ? pos.takeProfit.toString() : '');
                    }}
                  >
                    <Shield size={11} strokeWidth={2.4} />
                    <span>SL/TP</span>
                  </button>
                )}
                <button
                  className="btn btn-bear"
                  style={{ fontSize: 10, padding: '4px 10px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClosePosition(pos.id, curPrice);
                  }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Pending Limit & Protection Orders */}
      {(() => {
        const pendingOrders = orders.filter(o => o.status === 'pending');
        if (pendingOrders.length === 0) return null;
        return (
          <>
            <div style={{ padding: '10px 12px 4px', borderTop: '1px solid var(--border-dim)', marginTop: 4 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                PENDING ORDERS ({pendingOrders.length})
              </span>
            </div>
            {pendingOrders.map(o => {
              const isBuy = o.side === 'buy';
              const cleanSymbol = o.symbol.replace('.NS', '').replace('USDT', '');
              const qtyLabel = o.lot != null ? `${o.lot.toFixed(2)} Lot` : `${o.quantity} ${cleanSymbol}`;
              const priceLabel = formatAssetPrice(o.limitPrice ?? 0, o.symbol);

              let badgeText = isBuy ? 'Limit Buy' : 'Limit Sell';
              let badgeColor = isBuy ? 'var(--color-bull)' : 'var(--color-bear)';
              let badgeBg = isBuy ? 'var(--bg-bull)' : 'var(--bg-bear)';

              if (o.type === 'stop_loss') {
                badgeText = 'Stop Loss';
                badgeColor = 'var(--color-bear)';
                badgeBg = 'var(--bg-bear)';
              } else if (o.type === 'take_profit') {
                badgeText = 'Take Profit';
                badgeColor = 'var(--color-bull)';
                badgeBg = 'var(--bg-bull)';
              }

              return (
                <div
                  key={o.id}
                  onClick={() => handleOpenStock(o.symbol)}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    cursor: onSelectAsset ? 'pointer' : 'default',
                    background: 'var(--bg-canvas)',
                  }}
                  title={onSelectAsset ? `Click to open ${o.symbol} in Trade tab` : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                    <Clock size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <span
                      className="badge"
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                        flexShrink: 0,
                        padding: '1px 5px',
                        background: badgeBg,
                        color: badgeColor,
                        border: `1px solid ${badgeColor}`,
                        textTransform: 'uppercase',
                      }}
                    >
                      {badgeText}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 11,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textDecoration: onSelectAsset ? 'underline' : 'none',
                        textUnderlineOffset: 2,
                      }}
                    >
                      {qtyLabel} @ <span style={{ fontWeight: 700 }}>{priceLabel}</span>
                    </span>
                  </div>
                  {onCancelOrder && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelOrder(o.id);
                      }}
                      title="Cancel order"
                      className="btn btn-ghost"
                      style={{
                        border: '1px solid var(--border-dim)',
                        color: 'var(--color-bear)',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        height: 24,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </>
        );
      })()}

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
          <div
            key={h.id}
            onClick={() => handleOpenStock(h.symbol)}
            style={{
              borderBottom: '1px solid var(--border-dim)',
              cursor: onSelectAsset ? 'pointer' : 'default',
              transition: 'background 0.15s',
              padding: '9px 12px',
            }}
            title={onSelectAsset ? `Click to open ${h.symbol} in Trade tab` : undefined}
          >
            {/* Row 1: Symbol + badges + date */}
            <div className="row between" style={{ alignItems: 'center', marginBottom: 5 }}>
              <div className="row gap-1" style={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
                <span className="mono font-bold" style={{ fontSize: 12, textDecoration: onSelectAsset ? 'underline' : 'none', textUnderlineOffset: 2, flexShrink: 0 }}>
                  {h.symbol.replace('.NS','').replace('USDT','')}
                </span>
                <span className={`badge ${h.side === 'short' ? 'badge-bear' : 'badge-neutral'}`} style={{ fontSize: 8, flexShrink: 0 }}>
                  {h.side === 'short' ? 'SHORT' : 'LONG'}
                </span>
                {h.lot != null && (
                  <span className="badge badge-neutral" style={{ fontSize: 8, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                    {h.lot.toFixed(2)}L
                  </span>
                )}
                {onSelectAsset && <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>↗</span>}
              </div>
              {/* Net P&L — right aligned */}
              <span
                className="mono font-bold"
                style={{ fontSize: 13, color: isUp ? 'var(--color-bull)' : 'var(--color-bear)', flexShrink: 0, marginLeft: 8 }}
              >
                {isUp ? '+' : ''}{formatCurrency(h.realizedPnLUSD, account.currency, true)}
              </span>
            </div>

            {/* Row 2: Entry → Exit prices + fee */}
            <div className="row" style={{ alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                {formatAssetPrice(h.entryPriceUSD, h.symbol)}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>→</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>
                {formatAssetPrice(h.exitPriceUSD, h.symbol)}
              </span>
              <span style={{ fontSize: 9, color: 'var(--border-mid)', flexShrink: 0 }}>·</span>
              {h.commissionUSD != null && h.commissionUSD > 0 ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                  Fee ${h.commissionUSD.toFixed(2)}
                </span>
              ) : null}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
                {new Date(h.exitTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
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

      {/* ── Stop Loss & Take Profit Protection Modal ── */}
      {sltpPos && onUpdateSLTP && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSltpPos(null)}>
          <div className="modal-sheet" style={{ maxWidth: 380 }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <div className="col gap-1">
                <span className="mono font-bold" style={{ fontSize: 14 }}>
                  PROTECT {sltpPos.symbol.replace('.NS', '').replace('USDT', '')}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  Entry: {formatAssetPrice(sltpPos.entryPriceUSD, sltpPos.symbol)}
                </span>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px 6px' }} onClick={() => setSltpPos(null)}>
                <X size={15} />
              </button>
            </div>

            <div className="col gap-3" style={{ marginBottom: 16 }}>
              {/* Stop Loss Input */}
              <div className="col gap-1">
                <label className="row between" style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: 'var(--color-bear)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={11} /> {sltpPos.side === 'short' ? 'STOP LOSS (BUY IF ≥)' : 'STOP LOSS (SELL IF ≤)'}
                  </span>
                  <span
                    style={{ fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => { const v = sltpPos.entryPriceUSD * (sltpPos.side === 'short' ? 1.05 : 0.95); setModalSl(v.toFixed(v < 1 ? 5 : v < 100 ? 4 : 2)); }}
                  >
                    {sltpPos.side === 'short' ? '+5% Preset' : '-5% Preset'}
                  </span>
                </label>
                <input
                  className="input"
                  type="number"
                  placeholder="Leave empty to remove"
                  value={modalSl}
                  onChange={e => setModalSl(e.target.value)}
                  step="any"
                />
              </div>

              {/* Take Profit Input */}
              <div className="col gap-1">
                <label className="row between" style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: 'var(--color-bull)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Target size={11} /> {sltpPos.side === 'short' ? 'TAKE PROFIT (BUY IF ≤)' : 'TAKE PROFIT (SELL IF ≥)'}
                  </span>
                  <span
                    style={{ fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => { const v = sltpPos.entryPriceUSD * (sltpPos.side === 'short' ? 0.95 : 1.05); setModalTp(v.toFixed(v < 1 ? 5 : v < 100 ? 4 : 2)); }}
                  >
                    {sltpPos.side === 'short' ? '-5% Preset' : '+5% Preset'}
                  </span>
                </label>
                <input
                  className="input"
                  type="number"
                  placeholder="Leave empty to remove"
                  value={modalTp}
                  onChange={e => setModalTp(e.target.value)}
                  step="any"
                />
              </div>
            </div>

            <div className="row gap-2">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => setSltpPos(null)}
              >
                CANCEL
              </button>
              <button
                className="btn btn-bull flex-1"
                onClick={() => {
                  const sl = modalSl ? parseFloat(modalSl) : undefined;
                  const tp = modalTp ? parseFloat(modalTp) : undefined;
                  onUpdateSLTP(sltpPos.id, sl, tp);
                  setSltpPos(null);
                }}
              >
                SAVE PROTECTION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
