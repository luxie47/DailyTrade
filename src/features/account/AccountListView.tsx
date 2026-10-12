import { useState } from 'react';
import { Plus, Trash2, RefreshCw, Download, Upload, Info } from 'lucide-react';
import type { Account, Currency } from '../../types/account';
import { CURRENCIES } from '../../types/account';
import { exportJSON, type AppState } from '../../services/storage';

interface Props {
  accounts: Account[];
  activeAccountId: string;
  state: AppState;
  onSwitch: (id: string) => void;
  onOpenCreate: () => void;
  onOpenAbout: () => void;
  onTopUp: (amount: number) => void;
  onReset: (cash: number) => void;
  onDelete: (id: string) => void;
  onUpdateCurrency: (c: Currency) => void;
  onOpenExport?: () => void;
  onOpenImport?: () => void;
  onClose: () => void;
}

export function AccountListView({
  accounts,
  activeAccountId,
  state,
  onSwitch,
  onOpenCreate,
  onOpenAbout,
  onTopUp,
  onReset,
  onDelete,
  onUpdateCurrency,
  onOpenExport,
  onOpenImport,
  onClose,
}: Props) {
  const [customTopUp, setCustomTopUp] = useState('');

  const active = accounts.find(a => a.id === activeAccountId) ?? accounts[0];
  const cfg = (active && CURRENCIES.find(c => c.code === active.currency)) ?? CURRENCIES[0];

  const handleTopUp = (amt: number) => {
    onTopUp(amt / cfg.usdRate);
    onClose();
  };

  const handleReset = (cash: number) => {
    onReset(cash / cfg.usdRate);
    onClose();
  };

  return (
    <div className="col">
      <div className="row between" style={{ marginBottom: 16 }}>
        <span className="mono font-bold" style={{ fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          ACCOUNTS
        </span>
        <div className="row gap-2">
          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={onOpenAbout}>
            <Info size={12} /> ABOUT
          </button>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      {/* Account List */}
      {accounts.map(acc => {
        const isActive = acc.id === activeAccountId;
        const accCfg = (acc && CURRENCIES.find(c => c.code === acc.currency)) ?? CURRENCIES[0];
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
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: 10, border: '1px solid var(--border-dim)' }}
                onClick={e => { e.stopPropagation(); onDelete(acc.id); }}
                title="Delete Account"
              >
                <Trash2 size={11} color="var(--color-bear)" />
              </button>
            )}
          </div>
        );
      })}

      <button
        className="btn btn-ghost"
        style={{ width: '100%', padding: '10px', marginBottom: 16, border: '1px solid var(--border-dim)' }}
        onClick={onOpenCreate}
      >
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
        <div className="row gap-2" style={{ marginTop: 6, flexWrap: 'wrap' }}>
          {(cfg.usdRate >= 50
            ? [1000, 10000, 100000, 500000]
            : [1000, 5000, 10000, 50000]
          ).map(amt => (
            <button
              key={amt}
              className="btn btn-ghost flex-1"
              style={{ fontSize: 10, padding: '6px 4px', minWidth: 60, border: '1px solid var(--border-dim)' }}
              onClick={() => handleTopUp(amt)}
            >
              {cfg.symbol}{amt >= 100000 ? `${amt/100000}L` : amt >= 1000 ? `${amt/1000}K` : amt}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="row gap-2" style={{ marginTop: 6, marginBottom: 12 }}>
          <input
            className="input"
            type="number"
            placeholder={`Custom amount (${cfg.symbol})`}
            value={customTopUp}
            onChange={e => setCustomTopUp(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const amt = parseFloat(customTopUp);
                if (amt > 0) { handleTopUp(amt); setCustomTopUp(''); }
              }
            }}
            min="1"
            style={{ flex: 1, fontSize: 12 }}
          />
          <button
            className="btn btn-bull"
            style={{ fontSize: 11, padding: '6px 14px', flexShrink: 0 }}
            onClick={() => {
              const amt = parseFloat(customTopUp);
              if (amt > 0) { handleTopUp(amt); setCustomTopUp(''); }
            }}
          >
            + ADD
          </button>
        </div>

        {/* Reset & Storage Backup */}
        <div className="col gap-2">
          <button
            className="btn btn-ghost flex-1"
            style={{ fontSize: 11, padding: '8px', border: '1px solid var(--border-dim)' }}
            onClick={() => handleReset(active.startingCashUSD * cfg.usdRate)}
          >
            <RefreshCw size={12} /> RESET BALANCE
          </button>

          <div style={{ padding: '8px 10px', background: 'rgba(0, 230, 118, 0.05)', border: '1px solid rgba(0, 230, 118, 0.2)', marginTop: 4 }}>
            <span className="mono text-xs" style={{ color: '#4ade80', fontSize: 10 }}>
              🛡️ Auto-backup active: Trades auto-saved to Documents/DailyTrade. Safe from app updates.
            </span>
          </div>

          <div className="row gap-2">
            <button
              className="btn btn-ghost flex-1"
              style={{ fontSize: 11, padding: '8px', border: '1px solid var(--border-dim)' }}
              onClick={() => onOpenExport ? onOpenExport() : exportJSON(state)}
            >
              <Download size={12} /> EXPORT
            </button>
            <button
              className="btn btn-ghost flex-1"
              style={{ fontSize: 11, padding: '8px', border: '1px solid var(--border-dim)' }}
              onClick={onOpenImport}
            >
              <Upload size={12} /> IMPORT / RESTORE
            </button>
          </div>
        </div>
      </div>

      {/* Simulator Notice Footer */}
      <div style={{ marginTop: 16, padding: '8px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
          ⚠️ <strong>Simulator Notice:</strong> Virtual paper money only. Zero financial risk. Not financial advice.
        </p>
      </div>
    </div>
  );
}
