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
      style={{ padding: '0 10px', gap: 6, minHeight: 48 }}
    >
      {/* Left: Brand Logo & Account */}
      <div className="row gap-1" style={{ alignItems: 'center', flexShrink: 0 }}>
        <img
          src="/logo.png"
          alt="DailyTrade"
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            objectFit: 'contain',
            background: '#000',
            flexShrink: 0
          }}
        />
        <button
          className="btn btn-ghost row gap-1"
          style={{ padding: '4px 7px', borderColor: 'var(--border-dim)' }}
          onClick={onOpenAccountModal}
        >
          <Wallet size={12} strokeWidth={2} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--text-secondary)', maxWidth: 75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {account.name}
          </span>
          <ChevronDown size={10} />
        </button>
      </div>

      {/* Center: Balance */}
      <div
        className="col"
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          minWidth: 0,
          padding: '0 2px',
          textAlign: 'center',
          overflow: 'hidden'
        }}
      >
        <span
          className="num font-bold"
          style={{
            fontSize: 14,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            lineHeight: 1.15
          }}
        >
          {formatCurrency(totalEquityUSD, account.currency, true)}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            color: isUp ? 'var(--color-bull)' : 'var(--color-bear)',
            whiteSpace: 'nowrap',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            maxWidth: '100%'
          }}
        >
          {isUp ? '+' : ''}{formatCurrency(pnlUSD, account.currency, true)} ({isUp ? '+' : ''}{pnlPct.toFixed(0)}%)
        </span>
      </div>

      {/* Right: Quick Top-Up */}
      <button
        className="btn btn-outline row gap-1"
        style={{ padding: '4px 7px', fontSize: 11, flexShrink: 0 }}
        onClick={() => onQuickTopUp(currency.usdRate >= 50 ? 100000 / currency.usdRate : 10000)}
        title={`Add ${currency.symbol}${currency.usdRate >= 50 ? '1,00,000' : '10,000'}`}
      >
        <Plus size={11} />
        <span className="font-bold">{currency.symbol}{currency.usdRate >= 50 ? '1L' : '10K'}</span>
      </button>
    </header>
  );
}
