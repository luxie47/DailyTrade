import type { Position } from '../types/trade';
import type { Account } from '../types/account';
import { ASSET_MAP } from '../data/assets';
import { formatCurrency } from '../services/storage';
import { PieChart, DollarSign, Bitcoin, Building2, Flame, Layers, Landmark } from 'lucide-react';

interface Props {
  positions: Position[];
  prices: Record<string, number>;
  account: Account;
  totalEquityUSD: number;
}

interface AllocationItem {
  id: string;
  name: string;
  valueUSD: number;
  pct: number;
  color: string;
  icon: any;
}

export function PortfolioBreakdown({ positions, prices, account, totalEquityUSD }: Props) {
  // Aggregate position values by class
  const classTotals: Record<string, number> = {
    cash: Math.max(0, account.cashUSD),
    crypto: 0,
    stock: 0,
    commodity: 0,
    fund: 0,
    forex: 0,
    'fixed-income': 0,
  };

  for (const pos of positions) {
    const curPrice = prices[pos.symbol] ?? pos.entryPriceUSD;
    const value = curPrice * pos.quantity;
    const asset = ASSET_MAP[pos.symbol];
    const assetClass = asset?.class || 'crypto';
    classTotals[assetClass] = (classTotals[assetClass] || 0) + value;
  }

  const equity = Math.max(totalEquityUSD, 1);

  const allocations: AllocationItem[] = [
    {
      id: 'cash',
      name: 'Cash Balance',
      valueUSD: classTotals.cash,
      pct: (classTotals.cash / equity) * 100,
      color: '#3b82f6',
      icon: DollarSign,
    },
    {
      id: 'crypto',
      name: 'Cryptocurrencies',
      valueUSD: classTotals.crypto,
      pct: (classTotals.crypto / equity) * 100,
      color: '#f59e0b',
      icon: Bitcoin,
    },
    {
      id: 'stock',
      name: 'Equities & Stocks',
      valueUSD: classTotals.stock,
      pct: (classTotals.stock / equity) * 100,
      color: '#00e676',
      icon: Building2,
    },
    {
      id: 'commodity',
      name: 'Commodities & Oil',
      valueUSD: classTotals.commodity,
      pct: (classTotals.commodity / equity) * 100,
      color: '#ec4899',
      icon: Flame,
    },
    {
      id: 'forex',
      name: 'Forex & Currencies',
      valueUSD: classTotals.forex,
      pct: (classTotals.forex / equity) * 100,
      color: '#06b6d4',
      icon: DollarSign,
    },
    {
      id: 'fund',
      name: 'Mutual Funds & ETFs',
      valueUSD: classTotals.fund,
      pct: (classTotals.fund / equity) * 100,
      color: '#8b5cf6',
      icon: Layers,
    },
    {
      id: 'fixed-income',
      name: 'FD & Treasury Bonds',
      valueUSD: classTotals['fixed-income'],
      pct: (classTotals['fixed-income'] / equity) * 100,
      color: '#10b981',
      icon: Landmark,
    },
  ].filter(a => a.valueUSD > 0 || a.id === 'cash');

  return (
    <div className="card" style={{ margin: '10px 12px', padding: 14 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <PieChart size={14} color="var(--text-muted)" />
          <span style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}>
            PORTFOLIO ALLOCATION
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-secondary)' }}>
          {positions.length} Open Positions
        </span>
      </div>

      {/* Multi-segment progress bar */}
      <div style={{
        display: 'flex',
        height: 10,
        borderRadius: 2,
        overflow: 'hidden',
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border-dim)',
        marginBottom: 14,
      }}>
        {allocations.map(a => (
          <div
            key={a.id}
            title={`${a.name}: ${a.pct.toFixed(1)}%`}
            style={{
              width: `${Math.max(a.pct, 0)}%`,
              backgroundColor: a.color,
              transition: 'width 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Grid of allocation chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
        {allocations.map(a => {
          const Icon = a.icon;
          return (
            <div
              key={a.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-dim)',
              }}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: `${a.color}22`,
                border: `1px solid ${a.color}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: a.color,
                flexShrink: 0,
              }}>
                <Icon size={12} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <div className="row between" style={{ alignItems: 'baseline' }}>
                  <span style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {a.name.split(' ')[0]}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: a.color }}>
                    {a.pct.toFixed(0)}%
                  </span>
                </div>
                <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatCurrency(a.valueUSD, account.currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
