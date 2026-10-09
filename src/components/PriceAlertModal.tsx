import { useState } from 'react';
import { Bell, X, Trash2 } from 'lucide-react';
import { addAlert, loadAlerts, removeAlert, requestNotificationPermission } from '../services/priceAlerts';
import type { Asset } from '../types/market';
import { formatAssetPrice } from '../utils/formatPrice';

interface Props {
  asset: Asset;
  currentPrice: number;
  onClose: () => void;
}

export function PriceAlertModal({ asset, currentPrice, onClose }: Props) {
  const [targetPrice, setTargetPrice] = useState(currentPrice > 0 ? currentPrice.toString() : '');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [existingAlerts, setExistingAlerts] = useState(() =>
    loadAlerts().filter(a => a.symbol === asset.symbol && !a.triggered)
  );

  const handleAdd = async () => {
    const price = parseFloat(targetPrice);
    if (!price || price <= 0) return;
    await requestNotificationPermission();
    addAlert({ symbol: asset.symbol, targetPrice: price, direction });
    setExistingAlerts(loadAlerts().filter(a => a.symbol === asset.symbol && !a.triggered));
  };

  const handleDelete = (id: string) => {
    removeAlert(id);
    setExistingAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxWidth: 440, margin: '0 auto' }}>
        <div className="row between" style={{ marginBottom: 16 }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Bell size={16} />
            <span className="mono font-bold" style={{ fontSize: 13, letterSpacing: '0.04em' }}>
              PRICE ALERT — {asset.symbol.replace('USDT', '').replace('.NS', '')}
            </span>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="col gap-2" style={{ marginBottom: 16 }}>
          <div className="row gap-2">
            {(['above', 'below'] as const).map(d => (
              <button
                key={d}
                type="button"
                className={`btn flex-1 ${direction === d ? (d === 'above' ? 'btn-bull' : 'btn-bear') : 'btn-outline'}`}
                style={{ fontSize: 11, padding: '7px 0', textTransform: 'uppercase' }}
                onClick={() => setDirection(d)}
              >
                {d === 'above' ? '▲ When Above' : '▼ When Below'}
              </button>
            ))}
          </div>

          <div className="row gap-2">
            <input
              className="input flex-1"
              type="number"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              placeholder="Target price"
              step="any"
              style={{ fontSize: 13 }}
            />
            <button className="btn btn-white" style={{ fontSize: 11, padding: '8px 16px', flexShrink: 0 }} onClick={handleAdd}>
              SET ALERT
            </button>
          </div>

          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            Current: {currentPrice > 0 ? formatAssetPrice(currentPrice, asset.symbol) : 'Loading...'}
          </span>
        </div>

        {existingAlerts.length > 0 && (
          <div className="col gap-1" style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 12 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              ACTIVE ALERTS ({existingAlerts.length})
            </span>
            {existingAlerts.map(a => (
              <div key={a.id} className="row between" style={{ padding: '8px 12px', border: '1px solid var(--border-dim)', background: 'var(--bg-subtle)', borderRadius: 2 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: a.direction === 'above' ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                  {a.direction === 'above' ? '▲ >= ' : '▼ <= '} {formatAssetPrice(a.targetPrice, asset.symbol)}
                </span>
                <button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => handleDelete(a.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
