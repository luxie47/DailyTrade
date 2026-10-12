import { useState } from 'react';
import { Check } from 'lucide-react';
import { CURRENCIES, type Currency } from '../../types/account';

interface Props {
  onBack: () => void;
  onCreate: (name: string, currency: Currency, startingCash: number) => void;
}

export function AccountCreateView({ onBack, onCreate }: Props) {
  const [newName, setNewName] = useState('');
  const [newCurrency, setNewCurrency] = useState<Currency>('USD');
  const [newCash, setNewCash] = useState('10000');
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) {
      setError('Enter an account name');
      return;
    }
    const cash = parseFloat(newCash);
    if (!cash || cash < 100) {
      setError('Starting cash must be ≥ 100');
      return;
    }
    const currencyRate = CURRENCIES.find(c => c.code === newCurrency)?.usdRate ?? 1;
    onCreate(newName.trim(), newCurrency, cash / currencyRate);
  };

  return (
    <div className="col gap-3">
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className="mono font-bold" style={{ fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          NEW ACCOUNT
        </span>
        <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onBack}>
          BACK
        </button>
      </div>

      <div className="col gap-1">
        <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ACCOUNT NAME
        </label>
        <input
          className="input"
          placeholder="e.g. Crypto Degen"
          value={newName}
          onChange={e => { setNewName(e.target.value); setError(''); }}
        />
      </div>

      <div className="col gap-1">
        <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          CURRENCY
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              onClick={() => setNewCurrency(c.code)}
              style={{
                padding: '8px 4px',
                border: `1px solid ${newCurrency === c.code ? 'var(--border-bright)' : 'var(--border-dim)'}`,
                background: newCurrency === c.code ? 'var(--bg-hover)' : 'transparent',
                color: newCurrency === c.code ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 0,
                textAlign: 'center',
              }}
            >
              {c.symbol}<br />
              <span style={{ fontSize: 9 }}>{c.code}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="col gap-1">
        <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          STARTING CAPITAL ({CURRENCIES.find(c => c.code === newCurrency)?.symbol})
        </label>
        <input
          className="input"
          type="number"
          value={newCash}
          onChange={e => { setNewCash(e.target.value); setError(''); }}
          min="100"
        />
        <div className="row gap-2">
          {['10000', '50000', '100000', '500000'].map(v => (
            <button
              key={v}
              className="btn btn-ghost flex-1"
              style={{ fontSize: 10, padding: '4px 0', border: '1px solid var(--border-dim)' }}
              onClick={() => setNewCash(v)}
            >
              {parseInt(v).toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <span style={{ color: 'var(--color-bear)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {error}
        </span>
      )}

      <button className="btn btn-bull row gap-2 center" style={{ padding: '12px', fontSize: 12, marginTop: 4 }} onClick={handleCreate}>
        <Check size={14} /> CREATE ACCOUNT
      </button>
    </div>
  );
}
