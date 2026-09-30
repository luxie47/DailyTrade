import { TrendingUp, BarChart2, Layers, User } from 'lucide-react';

type Tab = 'trade' | 'markets' | 'portfolio' | 'accounts';

const TABS: { key: Tab; icon: typeof TrendingUp; label: string }[] = [
  { key: 'trade',     icon: TrendingUp, label: 'TRADE'     },
  { key: 'markets',   icon: BarChart2,  label: 'MARKETS'   },
  { key: 'portfolio', icon: Layers,     label: 'PORTFOLIO' },
  { key: 'accounts',  icon: User,       label: 'ACCOUNTS'  },
];

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  openPositions: number;
}

export type { Tab };

export function BottomNav({ active, onChange, openPositions }: Props) {
  return (
    <nav
      className="app-bottom-nav row"
      style={{ justifyContent: 'space-around' }}
    >
      {TABS.map(({ key, icon: Icon, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px 4px',
              position: 'relative',
              transition: 'color 0.15s',
            }}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.04em', fontWeight: isActive ? 600 : 500 }}>
              {label}
            </span>
            {/* Active indicator */}
            {isActive && (
              <span style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 20,
                height: 2,
                background: 'var(--text-primary)',
              }} />
            )}
            {/* Badge for open positions */}
            {key === 'portfolio' && openPositions > 0 && (
              <span style={{
                position: 'absolute',
                top: 6,
                right: '50%',
                marginRight: -16,
                background: 'var(--color-bull)',
                color: '#000',
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                fontWeight: 700,
                padding: '1px 4px',
                borderRadius: 0,
                minWidth: 14,
                textAlign: 'center',
              }}>
                {openPositions}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
