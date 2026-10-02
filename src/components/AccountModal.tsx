import { useState } from 'react';
import { Plus, Trash2, RefreshCw, Download, Upload, Check, ExternalLink, Heart, Info, Star, ShieldCheck, MessageSquare } from 'lucide-react';
import type { Account, Currency } from '../types/account';
import { CURRENCIES } from '../types/account';
import { formatCurrency, exportJSON, importJSON } from '../services/storage';
import type { AppState } from '../services/storage';

interface Props {
  accounts: Account[];
  activeAccountId: string;
  state: AppState;
  initialView?: View;
  onSwitch: (id: string) => void;
  onCreate: (name: string, currency: Currency, startingCash: number) => void;
  onTopUp: (amount: number) => void;
  onReset: (cash: number) => void;
  onDelete: (id: string) => void;
  onUpdateCurrency: (c: Currency) => void;
  onImport: (state: AppState) => void;
  onOpenExport?: () => void;
  onOpenImport?: () => void;
  onClose: () => void;
}

export type View = 'list' | 'create' | 'about';

export function AccountModal({
  accounts, activeAccountId, state, initialView = 'list',
  onSwitch, onCreate, onTopUp, onReset, onDelete, onUpdateCurrency, onImport, onOpenExport, onOpenImport, onClose
}: Props) {
  const [view, setView] = useState<View>(initialView);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCurrency, setNewCurrency] = useState<Currency>('USD');
  const [newCash, setNewCash] = useState('10000');
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

  if (view === 'about') {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-sheet" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
          <div className="row between" style={{ marginBottom: 16 }}>
            <span className="mono font-bold" style={{ fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              ABOUT US & OPEN SOURCE
            </span>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setView('list')}>
              BACK
            </button>
          </div>

          <div className="col gap-3">
            {/* Mission Statement */}
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', border: '1px solid var(--border-bright)' }}>
              <div className="row between" style={{ alignItems: 'center' }}>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <img
                    src="/logo.png"
                    alt="DailyTrade Logo"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 4,
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      objectFit: 'contain',
                      background: '#000',
                      flexShrink: 0
                    }}
                  />
                  <span className="mono font-bold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>DailyTrade</span>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: 10 }}>v1.0.0</span>
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
                We are <strong>open sourcing this app mentally and wholeheartedly for everyone</strong>. Built to provide a clean, uncompromising, 100% free paper trading platform with real live feeds and zero paywalls.
              </p>
            </div>

            {/* ⭐ Star This Repo Banner */}
            <div style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.05))', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Star size={16} color="#fbbf24" fill="#fbbf24" />
                <span className="mono font-bold" style={{ fontSize: 12, color: '#fef3c7', letterSpacing: '0.04em' }}>
                  PLEASE STAR THIS REPOSITORY!
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>
                If you like what we built, giving us a star on GitHub would mean the world to our team. It helps keep this project free and thriving.
              </p>
              <a
                href="https://github.com/luxie47/DailyTrade"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 10,
                  background: '#f59e0b',
                  color: '#000000',
                  padding: '8px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 800,
                  textDecoration: 'none',
                  borderRadius: 2,
                  letterSpacing: '0.05em',
                }}
              >
                <Star size={13} fill="#000" /> STAR ON GITHUB <ExternalLink size={12} />
              </a>
            </div>

            {/* Featured Project: DailyFlow */}
            <div style={{ padding: '14px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 4 }}>
                <Heart size={14} color="#818cf8" />
                <span className="mono font-bold" style={{ fontSize: 12, color: '#c7d2fe' }}>FEATURED PROJECT: DAILYFLOW</span>
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Check out my main app <strong>DailyFlow</strong> — a hybrid daily tracker, habit optimizer, and workflow powerhouse:
              </p>
              <a
                href="https://dailyflow-luxie.vercel.app"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 10,
                  background: '#4f46e5',
                  color: '#ffffff',
                  padding: '7px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: 'none',
                  borderRadius: 2,
                }}
              >
                VISIT DAILYFLOW <ExternalLink size={12} />
              </a>
            </div>

            {/* Android APK Download */}
            <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 15 }}>📱</span>
                <span className="mono font-bold" style={{ fontSize: 12, color: '#6ee7b7' }}>GET ANDROID APP (APK)</span>
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Install DailyTrade directly on your Android phone for native performance and full offline simulation.
              </p>
              <a
                href="https://github.com/luxie47/DailyTrade/releases/latest/download/DailyTrade.apk"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 10,
                  background: '#059669',
                  color: '#ffffff',
                  padding: '7px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: 'none',
                  borderRadius: 2,
                  letterSpacing: '0.04em',
                }}
              >
                <Download size={12} /> DOWNLOAD DAILYTRADE.APK (v1.0.0) <ExternalLink size={12} />
              </a>
            </div>

            {/* Discord */}
            <div style={{ padding: '14px', background: 'rgba(88, 101, 242, 0.08)', border: '1px solid rgba(88, 101, 242, 0.3)' }}>
              <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 15 }}>💬</span>
                <span className="mono font-bold" style={{ fontSize: 12, color: '#bbc1f9' }}>CHAT ON DISCORD</span>
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Have questions, feedback, or just want to say hi? Message me directly on Discord.
              </p>
              <a
                href="https://discord.com/users/1205116665059090454"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 10,
                  background: '#5865f2',
                  color: '#ffffff',
                  padding: '7px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: 'none',
                  borderRadius: 2,
                  letterSpacing: '0.04em',
                }}
              >
                💬 LUXIE47 ON DISCORD <ExternalLink size={12} />
              </a>
            </div>
            {/* Bugs & Issues */}
            <div style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
              <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 6 }}>
                <MessageSquare size={13} color="var(--text-primary)" />
                <span className="mono font-bold" style={{ fontSize: 11, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  BUGS &amp; ISSUES
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
                Found a bug or have a suggestion? Open a GitHub Issue — we read every single one.
              </p>
              <a
                href="https://github.com/luxie47/DailyTrade/issues/new"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'var(--bg-card)', border: '1px solid var(--border-mid)',
                  color: 'var(--text-primary)', padding: '7px 12px',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  textDecoration: 'none', letterSpacing: '0.04em',
                }}
              >
                <MessageSquare size={11} /> OPEN A GITHUB ISSUE
              </a>
            </div>

            {/* Support / Donate */}
            <div style={{ padding: '12px', background: 'rgba(251, 146, 60, 0.06)', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
              <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>🍵</span>
                <span className="mono font-bold" style={{ fontSize: 11, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SUPPORT DEVELOPMENT
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
                DailyTrade is 100% free with no ads. If it's been useful, buying me a chai keeps this project alive!
              </p>
              <a
                href="https://buymeachai.ezee.li/luxie47"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#fb923c', border: 'none',
                  color: '#000', padding: '8px 14px',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800,
                  textDecoration: 'none', borderRadius: 2, letterSpacing: '0.05em',
                }}
              >
                🍵 BUY ME A CHAI
              </a>
            </div>

            {/* In-App Privacy Policy Viewer */}
            <div style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
              <div className="row between" style={{ alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowPrivacy(prev => !prev)}>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <ShieldCheck size={14} color="#34d399" />
                  <span className="mono font-bold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                    PRIVACY POLICY (100% ON-DEVICE)
                  </span>
                </div>
                <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 10 }}>
                  {showPrivacy ? 'COLLAPSE' : 'VIEW DETAILS'}
                </button>
              </div>

              {showPrivacy && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-dim)', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <p style={{ margin: '0 0 6px' }}>• <strong>Zero Tracking:</strong> No analytics, telemetry, cookies, or user profiling.</p>
                  <p style={{ margin: '0 0 6px' }}>• <strong>No Accounts Required:</strong> You never need to sign up, provide emails, or store passwords.</p>
                  <p style={{ margin: '0 0 6px' }}>• <strong>Local Sandbox:</strong> All portfolios, balances, and orders stay on your phone or browser.</p>
                  <p style={{ margin: '0 0 6px' }}>• <strong>Public Market Data:</strong> Quotes stream from Binance & Yahoo public endpoints with zero personal tokens.</p>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Full policy is tracked in <code>PRIVACY.md</code> under the MIT License.</p>
                </div>
              )}
            </div>

            {/* Legal & Financial Disclaimer */}
            <div style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <span className="mono font-bold" style={{ fontSize: 10, color: 'var(--color-bear)', letterSpacing: '0.05em' }}>
                ⚠️ LEGAL & FINANCIAL DISCLAIMER
              </span>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                DailyTrade is an educational paper trading simulator. All currencies, balances, and orders are 100% virtual simulation credits with zero monetary value. DailyTrade does not provide real investment advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="modal-sheet" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="row between" style={{ marginBottom: 16 }}>
          <span className="mono font-bold" style={{ fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>ACCOUNTS</span>
          <div className="row gap-2">
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setView('about')}>
              <Info size={12} /> ABOUT
            </button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
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

          {/* Reset & Storage Backup */}
          <div className="col gap-2">
            <div className="row gap-2">
              <button
                className="btn btn-outline flex-1"
                style={{ fontSize: 11, padding: '8px' }}
                onClick={() => handleReset(active.startingCashUSD * cfg.usdRate)}
              >
                <RefreshCw size={12} /> RESET BALANCE
              </button>
            </div>

            {/* Persistent Storage Notice */}
            <div style={{ padding: '8px 10px', background: 'rgba(0, 230, 118, 0.05)', border: '1px solid rgba(0, 230, 118, 0.2)', marginTop: 4 }}>
              <span className="mono text-xs" style={{ color: '#4ade80', fontSize: 10 }}>
                🛡️ Auto-backup active: Trades auto-saved to Documents/DailyTrade. Safe from app updates.
              </span>
            </div>

            <div className="row gap-2">
              <button
                className="btn btn-outline flex-1"
                style={{ fontSize: 11, padding: '8px' }}
                onClick={() => onOpenExport ? onOpenExport() : exportJSON(state)}
              >
                <Download size={12} /> EXPORT
              </button>
              <button
                className="btn btn-outline flex-1"
                style={{ fontSize: 11, padding: '8px' }}
                onClick={() => onOpenImport ? onOpenImport() : handleImport()}
              >
                <Upload size={12} /> IMPORT / RESTORE
              </button>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer Footer */}
        <div style={{ marginTop: 16, padding: '8px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-dim)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
            ⚠️ <strong>Simulator Notice:</strong> Virtual paper money only. Zero financial risk. Not financial advice.
          </p>
        </div>

        {error && <span style={{ color: 'var(--color-bear)', fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 8 }}>{error}</span>}
      </div>
    </div>
  );
}
