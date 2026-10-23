import { useState } from 'react';
import { X, AlertTriangle, Target } from 'lucide-react';
import type { Asset } from '../types/market';
import type { Account } from '../types/account';
import { formatCurrency } from '../services/storage';
import { formatAssetPrice, getAssetUSDMultiplier } from '../utils/formatPrice';
import { LotSelector } from './LotSelector';
import { lotToUnits, unitsToLot, calculateRequiredMargin, calculatePotentialPnL, formatPotentialPnL } from '../core/trading/lots';

interface Props {
  asset: Asset;
  currentPrice: number;
  account: Account;
  positionQty?: number;
  onMarketBuy: (qty: number, sl?: number, tp?: number, lot?: number) => string | null;
  onMarketSell: (qty: number, sl?: number, tp?: number, lot?: number) => string | null;
  onLimitOrder: (side: 'buy' | 'sell', qty: number, price: number, lot?: number) => string | null;
  onClose: () => void;
}

type Tab = 'market' | 'limit';

export function TradeModal({ asset, currentPrice, account, positionQty, onMarketBuy, onMarketSell, onLimitOrder, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('market');
  const [lot, setLot] = useState<number>(0.01);
  const [limitPrice, setLimitPrice] = useState(currentPrice.toFixed(2));
  const [slEnabled, setSlEnabled] = useState(false);
  const [tpEnabled, setTpEnabled] = useState(false);
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');

  const execPrice = tab === 'market' ? currentPrice : parseFloat(limitPrice) || currentPrice;
  const quantityNum = lotToUnits(lot, asset.symbol, asset.class);
  const requiredMargin = calculateRequiredMargin(lot, execPrice, asset.symbol, asset.class);
  const hasPosition = positionQty != null && positionQty > 0;

  const quickLotClose = (pct: number) => {
    if (hasPosition) {
      const targetUnits = positionQty! * pct;
      const targetLot = unitsToLot(targetUnits, asset.symbol, asset.class);
      setLot(targetLot);
    }
  };

  const handleTrade = () => {
    setError(null);
    if (lot <= 0 || isNaN(lot)) { setError('Enter a valid lot size'); return; }
    if (quantityNum <= 0) { setError('Invalid trade quantity'); return; }

    if (side === 'buy' && requiredMargin > account.cashUSD) {
      setError(`Insufficient cash for required margin (${formatCurrency(requiredMargin, account.currency)})`);
      return;
    }

    let err: string | null = null;
    if (tab === 'market') {
      if (side === 'buy') {
        err = onMarketBuy(
          quantityNum,
          slEnabled && sl ? parseFloat(sl) : undefined,
          tpEnabled && tp ? parseFloat(tp) : undefined,
          lot,
        );
      } else {
        err = onMarketSell(
          quantityNum,
          slEnabled && sl ? parseFloat(sl) : undefined,
          tpEnabled && tp ? parseFloat(tp) : undefined,
          lot,
        );
      }
    } else {
      err = onLimitOrder(side, quantityNum, parseFloat(limitPrice) || currentPrice, lot);
    }
    if (err) { setError(err); return; }
    onClose();
  };

  const symbolLabel = asset.symbol.replace('.NS', '').replace('USDT', '');
  const execBtnClass = `btn ${side === 'buy' ? 'btn-bull' : 'btn-bear'}`;
  const execBtnLabel = tab === 'market'
    ? (side === 'buy'
        ? `BUY ${symbolLabel} AT MARKET`
        : (hasPosition ? `SELL ${symbolLabel} AT MARKET` : `SELL SHORT ${symbolLabel} AT MARKET`))
    : `PLACE ${side.toUpperCase()} LIMIT ORDER`;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        {/* Header */}
        <div className="row between" style={{ marginBottom: 16 }}>
          <div className="col gap-1">
            <span className="mono font-bold" style={{ fontSize: 15 }}>{asset.symbol.replace('.NS','').replace('USDT','')}</span>
            <span className="price" style={{ fontSize: 20 }}>
              {formatAssetPrice(currentPrice, asset.symbol)}
            </span>
          </div>
          <button className="btn btn-ghost" style={{ padding: '6px 8px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Cash available */}
        <div className="row between" style={{ padding: '8px 12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)', marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            AVAILABLE CASH
          </span>
          <span className="num font-bold" style={{ fontSize: 14 }}>
            {formatCurrency(account.cashUSD, account.currency)}
          </span>
        </div>

        {/* Order Type Tabs */}
        <div className="tab-bar" style={{ marginBottom: 12 }}>
          {(['market', 'limit'] as Tab[]).map(t => (
            <button key={t} className={`tab-item${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.toUpperCase()} ORDER
            </button>
          ))}
        </div>

        {/* BUY / SELL side switcher — visible on BOTH tabs */}
        <div className="row" style={{ marginBottom: 12, border: '1px solid var(--border-dim)' }}>
          {(['buy', 'sell'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setSide(s); setError(null); }}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                background: side === s ? (s === 'buy' ? 'var(--color-bull)' : 'var(--color-bear)') : 'transparent',
                color: side === s ? (s === 'buy' ? '#000' : '#fff') : 'var(--text-muted)',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Position info banner when SELL selected */}
        {side === 'sell' && (
          <div style={{ padding: '6px 10px', marginBottom: 10, background: hasPosition ? 'rgba(0,230,118,0.06)' : 'rgba(255,61,113,0.06)', border: `1px solid ${hasPosition ? 'rgba(0,230,118,0.25)' : 'rgba(255,61,113,0.25)'}` }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: hasPosition ? 'var(--color-bull)' : 'var(--color-bear)' }}>
              {hasPosition
                ? `Open: ${positionQty!.toFixed(positionQty! < 1 ? 6 : 4)} ${symbolLabel} available to sell`
                : 'Direct Short — opens a position that profits if price falls'}
            </span>
          </div>
        )}

        {/* Limit Price (for limit orders) */}
        {tab === 'limit' && (
          <div className="col gap-1" style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              LIMIT PRICE
            </label>
            <input
              className="input"
              type="number"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              min="0"
              step="any"
            />
          </div>
        )}

        {/* Exness-Style Lot Selector */}
        <LotSelector
          lot={lot}
          onChange={setLot}
          price={execPrice}
          symbol={asset.symbol}
          assetClass={asset.class}
          availableCashUSD={account.cashUSD}
          userCurrency={account.currency}
        />

        {/* Position close helpers when selling existing position */}
        {side === 'sell' && hasPosition && (
          <div className="row gap-2" style={{ marginBottom: 12 }}>
            {[0.25, 0.5, 0.75, 1].map(p => (
              <button
                key={p}
                type="button"
                className="btn btn-outline flex-1"
                style={{ fontSize: 10, padding: '4px 0' }}
                onClick={() => quickLotClose(p)}
              >
                {p === 1 ? 'ALL' : `${p * 100}%`}
              </button>
            ))}
          </div>
        )}

        {/* SL / TP for Market Orders (Buy & Short) */}
        {tab === 'market' && (
          <div className="col gap-2" style={{ marginBottom: 12 }}>
            {/* Stop Loss */}
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <button
                type="button"
                className={`btn ${slEnabled ? 'btn-bear' : 'btn-outline'}`}
                style={{ fontSize: 10, padding: '4px 8px' }}
                onClick={() => {
                  setSlEnabled(!slEnabled);
                  if (!sl) {
                    const defaultSl = side === 'buy' ? currentPrice * 0.95 : currentPrice * 1.05;
                    setSl(defaultSl.toFixed(2));
                  }
                }}
              >
                <AlertTriangle size={10} /> SL
              </button>
              {slEnabled && (
                <>
                  <input
                    className="input flex-1"
                    type="number"
                    placeholder="Stop price"
                    value={sl}
                    onChange={e => setSl(e.target.value)}
                    step="any"
                  />
                  {(() => {
                    const parsed = parseFloat(sl);
                    if (!parsed || isNaN(parsed) || parsed <= 0) return null;
                    const loss = calculatePotentialPnL(execPrice, parsed, side, lot, undefined, asset.symbol, asset.class);
                    return (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#ff3d71',
                          background: '#0d0d12',
                          border: '1px solid rgba(255, 61, 113, 0.5)',
                          borderRadius: 4,
                          padding: '4px 7px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                        }}
                        title="Estimated potential loss in dollars"
                      >
                        {formatPotentialPnL(loss)}
                      </span>
                    );
                  })()}
                </>
              )}
            </div>
            {/* Take Profit */}
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <button
                type="button"
                className={`btn ${tpEnabled ? 'btn-bull' : 'btn-outline'}`}
                style={{ fontSize: 10, padding: '4px 8px', color: tpEnabled ? '#000' : undefined }}
                onClick={() => {
                  setTpEnabled(!tpEnabled);
                  if (!tp) {
                    const defaultTp = side === 'buy' ? currentPrice * 1.05 : currentPrice * 0.95;
                    setTp(defaultTp.toFixed(2));
                  }
                }}
              >
                <Target size={10} /> TP
              </button>
              {tpEnabled && (
                <>
                  <input
                    className="input flex-1"
                    type="number"
                    placeholder="Target price"
                    value={tp}
                    onChange={e => setTp(e.target.value)}
                    step="any"
                  />
                  {(() => {
                    const parsed = parseFloat(tp);
                    if (!parsed || isNaN(parsed) || parsed <= 0) return null;
                    const profit = calculatePotentialPnL(execPrice, parsed, side, lot, undefined, asset.symbol, asset.class);
                    return (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#00e676',
                          background: '#0d0d12',
                          border: '1px solid rgba(0, 230, 118, 0.5)',
                          borderRadius: 4,
                          padding: '4px 7px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                        }}
                        title="Estimated potential profit in dollars"
                      >
                        {formatPotentialPnL(profit)}
                      </span>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '8px 12px', background: 'var(--bg-bear)', border: '1px solid var(--color-bear)', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-bear)' }}>{error}</span>
          </div>
        )}

        {/* Execute Button */}
        <button
          className={execBtnClass}
          style={{ width: '100%', padding: '14px', fontSize: 13, cursor: 'pointer' }}
          onClick={handleTrade}
        >
          {execBtnLabel}
        </button>
      </div>
    </div>
  );
}
