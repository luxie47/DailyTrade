import { useState } from 'react';
import { X, AlertTriangle, Target } from 'lucide-react';
import type { Asset } from '../types/market';
import type { Account } from '../types/account';
import { formatCurrency } from '../services/storage';
import { formatAssetPrice } from '../utils/formatPrice';

interface Props {
  asset: Asset;
  currentPrice: number;
  account: Account;
  positionQty?: number;
  onMarketBuy: (qty: number, sl?: number, tp?: number) => string | null;
  onLimitOrder: (side: 'buy' | 'sell', qty: number, price: number) => string | null;
  onClose: () => void;
}

type Tab = 'market' | 'limit';

export function TradeModal({ asset, currentPrice, account, positionQty, onMarketBuy, onLimitOrder, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('market');
  const [qty, setQty] = useState('');
  const [limitPrice, setLimitPrice] = useState(currentPrice.toFixed(2));
  const [slEnabled, setSlEnabled] = useState(false);
  const [tpEnabled, setTpEnabled] = useState(false);
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');

  const quantityNum = parseFloat(qty) || 0;
  const execPrice = tab === 'market' ? currentPrice : parseFloat(limitPrice) || currentPrice;
  const cost = quantityNum * execPrice;

  const quickPct = (pct: number) => {
    if (tab === 'limit' && side === 'sell' && positionQty && positionQty > 0) {
      setQty((positionQty * pct).toFixed(positionQty < 1 ? 6 : 4));
      return;
    }
    if (execPrice <= 0) return;
    const maxAffordable = account.cashUSD / execPrice;
    setQty((maxAffordable * pct).toFixed(6));
  };

  const handleTrade = () => {
    setError(null);
    if (quantityNum <= 0) { setError('Enter a valid quantity'); return; }

    let err: string | null = null;
    if (tab === 'market') {
      err = onMarketBuy(
        quantityNum,
        slEnabled && sl ? parseFloat(sl) : undefined,
        tpEnabled && tp ? parseFloat(tp) : undefined,
      );
    } else {
      err = onLimitOrder(side, quantityNum, parseFloat(limitPrice) || currentPrice);
    }
    if (err) { setError(err); return; }
    onClose();
  };

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

        {/* Limit order side switcher */}
        {tab === 'limit' && (
          <div className="row" style={{ marginBottom: 12, border: '1px solid var(--border-dim)' }}>
            {(['buy', 'sell'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSide(s)}
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

        {/* Quantity */}
        <div className="col gap-1" style={{ marginBottom: 8 }}>
          <label style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            QUANTITY
          </label>
          <input
            className="input"
            type="number"
            placeholder="0.00"
            value={qty}
            onChange={e => setQty(e.target.value)}
            min="0"
            step="any"
          />
        </div>

        {/* Quick % buttons */}
        <div className="row gap-2" style={{ marginBottom: 12 }}>
          {[0.25, 0.5, 0.75, 1].map(p => (
            <button
              key={p}
              className="btn btn-outline flex-1"
              style={{ fontSize: 10, padding: '4px 0' }}
              onClick={() => quickPct(p)}
            >
              {p * 100}%
            </button>
          ))}
        </div>

        {/* Cost display */}
        {quantityNum > 0 && (
          <div className="row between" style={{ padding: '8px 12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>TOTAL COST</span>
            <span className="num font-bold" style={{ fontSize: 14, color: cost > account.cashUSD ? 'var(--color-bear)' : 'var(--text-primary)' }}>
              {formatCurrency(cost, account.currency)}
            </span>
          </div>
        )}

        {/* SL / TP — market orders only */}
        {tab === 'market' && (
          <div className="col gap-2" style={{ marginBottom: 12 }}>
            {/* Stop Loss */}
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <button
                className={`btn ${slEnabled ? 'btn-bear' : 'btn-outline'}`}
                style={{ fontSize: 10, padding: '4px 8px' }}
                onClick={() => { setSlEnabled(!slEnabled); if (!sl) setSl((currentPrice * 0.95).toFixed(2)); }}
              >
                <AlertTriangle size={10} /> SL
              </button>
              {slEnabled && (
                <input className="input flex-1" type="number" placeholder="Stop price" value={sl} onChange={e => setSl(e.target.value)} step="any" />
              )}
            </div>
            {/* Take Profit */}
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <button
                className={`btn ${tpEnabled ? 'btn-bull' : 'btn-outline'}`}
                style={{ fontSize: 10, padding: '4px 8px', color: tpEnabled ? '#000' : undefined }}
                onClick={() => { setTpEnabled(!tpEnabled); if (!tp) setTp((currentPrice * 1.05).toFixed(2)); }}
              >
                <Target size={10} /> TP
              </button>
              {tpEnabled && (
                <input className="input flex-1" type="number" placeholder="Target price" value={tp} onChange={e => setTp(e.target.value)} step="any" />
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
          className={`btn ${tab === 'market' ? 'btn-bull' : side === 'buy' ? 'btn-bull' : 'btn-bear'}`}
          style={{ width: '100%', padding: '14px', fontSize: 13 }}
          onClick={handleTrade}
        >
          {tab === 'market' ? `BUY ${asset.symbol.replace('.NS','').replace('USDT','')} AT MARKET` : `PLACE ${side.toUpperCase()} LIMIT ORDER`}
        </button>
      </div>
    </div>
  );
}
