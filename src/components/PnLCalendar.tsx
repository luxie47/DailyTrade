import { useState } from 'react';
import type { ClosedTrade } from '../types/trade';
import type { Account } from '../types/account';
import { formatCurrency } from '../services/storage';

interface Props {
  history: ClosedTrade[];
  account: Account;
}

export function PnLCalendar({ history, account }: Props) {
  const [selectedDay, setSelectedDay] = useState<{ date: string; pnl: number } | null>(null);

  // Group closed trades by UTC day (YYYY-MM-DD)
  const dayMap: Record<string, number> = {};
  for (const trade of history) {
    const day = new Date(trade.exitTime).toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] ?? 0) + trade.realizedPnLUSD;
  }

  // Show 20 full weeks (140 days) to span across the entire screen
  const TOTAL_WEEKS = 20;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - dayOfWeek - ((TOTAL_WEEKS - 1) * 7));

  const days: { date: string; pnl: number; isFuture: boolean }[] = [];
  for (let i = 0; i < TOTAL_WEEKS * 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      date: key,
      pnl: dayMap[key] ?? 0,
      isFuture: d > today,
    });
  }

  const maxAbs = Math.max(...days.filter(d => !d.isFuture).map(d => Math.abs(d.pnl)), 1);

  const getColor = (pnl: number, isFuture: boolean) => {
    if (isFuture) return 'transparent';
    if (pnl === 0) return 'var(--bg-hover)';
    const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
    const alpha = 0.25 + intensity * 0.75;
    return pnl > 0
      ? `rgba(0, 230, 118, ${alpha})`
      : `rgba(255, 61, 113, ${alpha})`;
  };

  // Week labels (Sunday to Saturday)
  const weekLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weeks: { date: string; pnl: number; isFuture: boolean }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const totalPnL = Object.values(dayMap).reduce((s, v) => s + v, 0);
  const tradingDays = Object.values(dayMap).filter(v => v !== 0).length;
  const winDays = Object.values(dayMap).filter(v => v > 0).length;

  return (
    <div style={{ padding: '14px 12px', borderTop: '1px solid var(--border-dim)' }}>
      {/* Header */}
      <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          DAILY P&amp;L CALENDAR
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: totalPnL >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
          {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, account.currency, true)} all time
        </span>
      </div>

      {/* Grid spanning 100% of the available width */}
      <div style={{ display: 'flex', width: '100%', gap: 3, marginBottom: 8, alignItems: 'stretch' }}>
        {/* Day-of-week labels */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginRight: 3, flexShrink: 0, paddingBottom: 1 }}>
          {weekLabels.map((l, i) => (
            <span key={i} style={{ height: 12, lineHeight: '12px', fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-muted)', width: 10, textAlign: 'center' }}>
              {l}
            </span>
          ))}
        </div>

        {/* Weeks stretching across 100% of remaining width */}
        <div style={{ display: 'flex', flex: 1, gap: 2.5, width: '100%', minWidth: 0 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2.5, minWidth: 0 }}>
              {week.map(({ date, pnl, isFuture }) => (
                <div
                  key={date}
                  title={isFuture ? `${date} (Upcoming)` : `${date}: ${pnl >= 0 ? '+' : ''}${formatCurrency(pnl, account.currency)}`}
                  onClick={() => !isFuture && setSelectedDay({ date, pnl })}
                  style={{
                    width: '100%',
                    height: 12,
                    background: getColor(pnl, isFuture),
                    border: isFuture
                      ? '1px dashed rgba(255,255,255,0.03)'
                      : (selectedDay?.date === date ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.05)'),
                    transition: 'transform 0.1s, opacity 0.15s',
                    borderRadius: 2,
                    opacity: isFuture ? 0.2 : 1,
                    cursor: isFuture ? 'default' : 'pointer',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Day Details (if clicked) */}
      {selectedDay && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 2, marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            📅 {selectedDay.date}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: selectedDay.pnl >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
            {selectedDay.pnl >= 0 ? '+' : ''}{formatCurrency(selectedDay.pnl, account.currency, true)}
          </span>
        </div>
      )}

      {/* Stats row */}
      <div style={{ marginTop: 6, display: 'flex', gap: 16 }}>
        {[
          { label: 'TRADING DAYS', value: tradingDays },
          { label: 'WIN DAYS', value: winDays },
          { label: 'DAY WIN RATE', value: tradingDays > 0 ? `${Math.round(winDays / tradingDays * 100)}%` : '—' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PnLCalendar;
