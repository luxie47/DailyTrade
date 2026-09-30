import { useEffect, useRef } from 'react';
import { createChart, ColorType, AreaSeries, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import type { EquityPoint } from '../types/account';
import type { Account } from '../types/account';
import { formatCurrency } from '../services/storage';

interface Props {
  history: EquityPoint[];
  account: Account;
  totalEquityUSD: number;
}

export function PortfolioChart({ history, account, totalEquityUSD }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#08080a' },
        textColor: '#52525b',
        fontSize: 10,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.06)', timeVisible: true },
      width: containerRef.current.clientWidth || 360,
      height: 160,
    });

    const s = chart.addSeries(AreaSeries, {
      lineColor: '#00e676',
      topColor: 'rgba(0, 230, 118, 0.22)',
      bottomColor: 'rgba(0, 230, 118, 0)',
      lineWidth: 2,
    });
    chartRef.current = chart;
    seriesRef.current = s as ISeriesApi<'Area'>;

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!history.length || !seriesRef.current) return;
    // Deduplicate timestamps (lightweight-charts requires strictly ascending time)
    const seen = new Set<number>();
    const data: { time: Time; value: number }[] = [];
    for (const pt of history) {
      if (seen.has(pt.time)) continue;
      seen.add(pt.time);
      data.push({ time: pt.time as Time, value: pt.value } as { time: Time; value: number });
    }
    data.sort((a, b) => (a.time as number) - (b.time as number));
    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
    // Apply color based on performance
    const first = data[0]?.value ?? totalEquityUSD;
    const isUp = totalEquityUSD >= first;
    seriesRef.current.applyOptions({
      lineColor: isUp ? '#00e676' : '#ff3d71',
      topColor: isUp ? 'rgba(0,230,118,0.22)' : 'rgba(255,61,113,0.22)',
      bottomColor: isUp ? 'rgba(0,230,118,0)' : 'rgba(255,61,113,0)',
    });
  }, [history, totalEquityUSD]);

  const startValue = history[0]?.value ?? account.startingCashUSD;
  const change = totalEquityUSD - startValue;
  const pct = startValue > 0 ? (change / startValue) * 100 : 0;
  const isUp = change >= 0;

  return (
    <div className="card" style={{ margin: '0 0 1px', borderRadius: 0, borderLeft: 'none', borderRight: 'none' }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="col gap-1">
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            PORTFOLIO EQUITY
          </span>
          <span className="num font-bold" style={{ fontSize: 22 }}>
            {formatCurrency(totalEquityUSD, account.currency)}
          </span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
          <span
            className="badge"
            style={{
              color: isUp ? 'var(--color-bull)' : 'var(--color-bear)',
              borderColor: isUp ? 'var(--color-bull)' : 'var(--color-bear)',
              background: isUp ? 'var(--bg-bull)' : 'var(--bg-bear)',
              fontSize: 11,
            }}
          >
            {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            ALL TIME
          </span>
        </div>
      </div>
      <div ref={containerRef} style={{ width: '100%' }} />
    </div>
  );
}
