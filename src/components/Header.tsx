import { useState } from 'react';
import { Wallet, ChevronDown, Plus } from 'lucide-react';
import type { Account } from '../types/account';
import { CURRENCIES } from '../types/account';
import { formatCurrency } from '../services/storage';

interface Props {
  account: Account;
  totalEquityUSD: number;
  unrPnLUSD: number;
  onOpenAccountModal: () => void;
  onQuickTopUp: (amount: number) => void;
}

export function Header({ account, totalEquityUSD, unrPnLUSD, onOpenAccountModal, onQuickTopUp }: Props) {
  const currency = (account && CURRENCIES.find(c => c.code === account.currency)) ?? CURRENCIES[0];
  const startingCash = account?.startingCashUSD ?? 10000;
  const pnlUSD = totalEquityUSD - startingCash;
  const pnlPct = startingCash > 0 ? (pnlUSD / startingCash) * 100 : 0;
  const isUp = pnlUSD >= 0;

  return (
    <header
      className="app-header row between"
      style={{ padding: '0 16px', gap: 8 }}
    >
      {/* Left: Brand Logo & Account */}
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <img
          src="/logo.png"
          alt="DailyTrade"
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            objectFit: 'contain',
            background: '#000',
            flexShrink: 0
          }}
        />
        <button
          className="btn btn-ghost row gap-2"
          style={{ padding: '6px 10px', borderColor: 'var(--border-dim)' }}
          onClick={onOpenAccountModal}
        >
          <Wallet size={14} strokeWidth={2} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--text-secondary)' }}>
            {account.name.length > 12 ? account.name.slice(0, 12) + '…' : account.name}
          </span>
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Center: Balance */}
      <div className="col" style={{ alignItems: 'center', flex: 1 }}>
        <span className="num font-bold" style={{ fontSize: 17, letterSpacing: '-0.02em' }}>
          {formatCurrency(totalEquityUSD, account.currency, true)}
        </span>
        <span
          className="mono text-xs"
          style={{ color: isUp ? 'var(--color-bull)' : 'var(--color-bear)' }}
        >
          {isUp ? '+' : ''}{formatCurrency(pnlUSD, account.currency, true)} ({isUp ? '+' : ''}{pnlPct.toFixed(1)}%)
        </span>
      </div>

      {/* Right: Quick Top-Up */}
      <button
        className="btn btn-outline row gap-1"
        style={{ padding: '6px 10px', fontSize: 11 }}
        onClick={() => onQuickTopUp(currency.usdRate >= 50 ? 100000 / currency.usdRate : 10000)}
        title={`Add ${currency.symbol}${currency.usdRate >= 50 ? '1,00,000' : '10,000'}`}
      >
        <Plus size={12} />
        <span>{currency.symbol}{currency.usdRate >= 50 ? '1L' : '10K'}</span>
      </button>
    </header>
  );
}
