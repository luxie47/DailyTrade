import { useState } from 'react';
import { Plus, Trash2, RefreshCw, Download, Upload, Check } from 'lucide-react';
import type { Account, Currency } from '../types/account';
import { CURRENCIES } from '../types/account';
import { formatCurrency, exportJSON, importJSON } from '../services/storage';
import type { AppState } from '../services/storage';

interface Props {
  accounts: Account[];
  activeAccountId: string;
  state: AppState;
  onSwitch: (id: string) => void;
  onCreate: (name: string, currency: Currency, startingCash: number) => void;
  onTopUp: (amount: number) => void;
  onReset: (cash: number) => void;
  onDelete: (id: string) => void;
  onUpdateCurrency: (c: Currency) => void;
  onImport: (state: AppState) => void;
  onClose: () => void;
}

type View = 'list' | 'create' | 'topup';

export function AccountModal({
  accounts, activeAccountId, state,
  onSwitch, onCreate, onTopUp, onReset, onDelete, onUpdateCurrency, onImport, onClose
}: Props) {
  const [view, setView] = useState<View>('list');
  const [newName, setNewName] = useState('');
  const [newCurrency, setNewCurrency] = useState<Currency>('USD');
  const [newCash, setNewCash] = useState('10000');
  const [topupAmt, setTopupAmt] = useState('');
  const [error, setError] = useState('');

  const active = accounts.find(a => a.id === activeAccountId) ?? accounts[0];
  const cfg = (active && CURRENCIES.find(c => c.code === active.currency)) ?? CURRENCIES[0];

  const handleCreate = () => {
    if (!newName.trim()) { setError('Enter an account name'); return; }
    const cash = parseFloat(newCash);
    if (!cash || cash < 100) { setError('Starting cash must be ≥ 100'); return; }
    onCreate(newName.trim(), newCurrency, cash / (CURRENCIES.find(c => c.code === newCurrency)?.usdRate ?? 1));
    onClose();
  };

  const handleTopUp = (amt: number) => {
    onTopUp(amt / cfg.usdRate);
    onClose();
  };

  const handleReset = (cash: number) => {
    onReset(cash / cfg.usdRate);
    onClose();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const imported = importJSON(text);
        onImport(imported);
        onClose();
      } catch {
        setError('Invalid backup file');
      }
    };
    input.click();
  };

  if (view === 'create') {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-sheet">
          <div className="row between" style={{ marginBottom: 20 }}>
            <span className="mono font-bold" style={{ fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>NEW ACCOUNT</span>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setView('list')}>BACK</button>
          </div>

          <div className="col gap-3">
            <div className="col gap-1">
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                ACCOUNT NAME
              </label>
              <input className="input" placeholder="e.g. Crypto Degen" value={newName} onChange={e => setNewName(e.target.value)} />
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
                STARTING CAPITAL ({CURRENCIES.find(c=>c.code===newCurrency)?.symbol})
              </label>
              <input className="input" type="number" value={newCash} onChange={e => setNewCash(e.target.value)} min="100" />
              <div className="row gap-2">
                {['10000','50000','100000','500000'].map(v => (
                  <button key={v} className="btn btn-outline flex-1" style={{ fontSize: 10, padding: '4px 0' }} onClick={() => setNewCash(v)}>
                    {parseInt(v).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {error && <span style={{ color: 'var(--color-bear)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{error}</span>}

            <button className="btn btn-white" style={{ padding: '12px', fontSize: 12 }} onClick={handleCreate}>
              <Check size={14} /> CREATE ACCOUNT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="row between" style={{ marginBottom: 16 }}>
          <span className="mono font-bold" style={{ fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>ACCOUNTS</span>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        {/* Account List */}
        {accounts.map(acc => {
          const isActive = acc.id === activeAccountId;
          const accCfg = CURRENCIES.find(c => c.code === acc.currency)!;
          return (
            <div
              key={acc.id}
              onClick={() => { onSwitch(acc.id); onClose(); }}
              style={{
                padding: '12px',
                border: `1px solid ${isActive ? 'var(--border-bright)' : 'var(--border-dim)'}`,
                marginBottom: 8,
                cursor: 'pointer',
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div className="col flex-1" style={{ gap: 2 }}>
                <div className="row gap-2">
                  <span className="mono font-bold" style={{ fontSize: 13 }}>{acc.name}</span>
                  {isActive && <span className="badge badge-neutral" style={{ fontSize: 9 }}>ACTIVE</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {accCfg.symbol} {(acc.cashUSD * accCfg.usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })} cash · {acc.currency}
                </span>
              </div>
              {!isActive && accounts.length > 1 && (
                <button
                  className="btn btn-outline"
                  style={{ padding: '4px 8px', fontSize: 10 }}
                  onClick={e => { e.stopPropagation(); onDelete(acc.id); }}
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          );
        })}

        <button className="btn btn-outline" style={{ width: '100%', padding: '10px', marginBottom: 16 }} onClick={() => { setView('create'); setError(''); }}>
          <Plus size={14} /> NEW ACCOUNT
        </button>

        <div className="sep" />

        {/* Active account controls */}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {active.name} — CONTROLS
        </span>
        <div style={{ marginTop: 10 }}>
          {/* Currency switcher */}
          <div className="col gap-1" style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              BASE CURRENCY
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => onUpdateCurrency(c.code)}
                  style={{
                    padding: '6px 4px',
                    border: `1px solid ${active.currency === c.code ? 'var(--border-bright)' : 'var(--border-dim)'}`,
                    background: active.currency === c.code ? 'var(--bg-hover)' : 'transparent',
                    color: active.currency === c.code ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: 0,
                  }}
                >
                  {c.symbol} {c.code}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Top-Up */}
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ADD FUNDS
          </label>
          <div className="row gap-2" style={{ marginTop: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {(cfg.usdRate >= 50
              ? [1000, 10000, 100000, 500000]
              : [1000, 5000, 10000, 50000]
            ).map(amt => (
              <button
                key={amt}
                className="btn btn-outline flex-1"
                style={{ fontSize: 10, padding: '6px 4px', minWidth: 60 }}
                onClick={() => handleTopUp(amt)}
              >
                {cfg.symbol}{amt >= 100000 ? `${amt/100000}L` : amt >= 1000 ? `${amt/1000}K` : amt}
              </button>
            ))}
          </div>

          {/* Reset Account */}
          <div className="row gap-2">
            <button
              className="btn btn-outline flex-1"
              style={{ fontSize: 11, padding: '8px' }}
              onClick={() => handleReset(active.startingCashUSD * cfg.usdRate)}
            >
              <RefreshCw size={12} /> RESET
            </button>
            <button
              className="btn btn-outline flex-1"
              style={{ fontSize: 11, padding: '8px' }}
              onClick={() => exportJSON(state)}
            >
              <Download size={12} /> EXPORT
            </button>
            <button
              className="btn btn-outline flex-1"
              style={{ fontSize: 11, padding: '8px' }}
              onClick={handleImport}
            >
              <Upload size={12} /> IMPORT
            </button>
          </div>
        </div>
        {error && <span style={{ color: 'var(--color-bear)', fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 8 }}>{error}</span>}
      </div>
    </div>
  );
}
