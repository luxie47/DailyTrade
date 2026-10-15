import { useEffect, useRef, useState } from 'react';
import {
  createChart, ColorType, CrosshairMode, LineStyle,
  CandlestickSeries, AreaSeries, HistogramSeries,
  type IChartApi, type ISeriesApi, type Time, type IPriceLine,
} from 'lightweight-charts';
import { ArrowLeft } from 'lucide-react';
import type { Candle, Timeframe } from '../types/market';
import { formatAssetPrice } from '../utils/formatPrice';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '1D'];

const TF_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '1D': 86400,
};

interface Props {
  symbol: string;
  name: string;
  assetClass: string;
  candles: Candle[];
  livePrice: number | null;
  entryPrice?: number;           // dotted entry price line
  stopLoss?: number;             // red dashed SL line
  takeProfit?: number;           // green dashed TP line
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  loading: boolean;
  onBack: () => void;
}

export function TradingViewChart({
  symbol, name, assetClass, candles, livePrice, entryPrice, stopLoss, takeProfit,
  timeframe, onTimeframeChange, loading, onBack
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const chartRef      = useRef<IChartApi | null>(null);
  const candleRef     = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const areaRef       = useRef<ISeriesApi<'Area'> | null>(null);
  const volRef        = useRef<ISeriesApi<'Histogram'> | null>(null);
  const entryLineRef  = useRef<IPriceLine | null>(null);
  const slLineRef     = useRef<IPriceLine | null>(null);
  const tpLineRef     = useRef<IPriceLine | null>(null);
  const curLineRef    = useRef<IPriceLine | null>(null);
  const [chartType, setChartType] = useState<'candle' | 'area'>('candle');

  // ── Init chart once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#71717a',
        fontSize: 10,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        textColor: '#52525b',
        scaleMargins: { top: 0.1, bottom: 0.15 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 7,
        minBarSpacing: 3,
        rightOffset: 5,
      },
      width: containerRef.current.clientWidth || 360,
      height: 300,
    });

    const cs = chart.addSeries(CandlestickSeries, {
      upColor: '#00e676', downColor: '#ff3d71',
      borderUpColor: '#00e676', borderDownColor: '#ff3d71',
      wickUpColor: '#00e676', wickDownColor: '#ff3d71',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const as = chart.addSeries(AreaSeries, {
      lineColor: '#f4f4f5',
      topColor: 'rgba(244,244,245,0.18)',
      bottomColor: 'rgba(244,244,245,0)',
      lineWidth: 2, visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const vs = chart.addSeries(HistogramSeries, {
      color: 'rgba(255,255,255,0.12)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chartRef.current     = chart;
    candleRef.current    = cs;
    areaRef.current      = as;
    volRef.current       = vs;

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  const lastCandleRef = useRef<Candle | null>(null);
  const fittedKeyRef  = useRef<string>('');

  // ── Reset live candle ref on timeframe change ────────────────────────────
  useEffect(() => {
    lastCandleRef.current = null;
    fittedKeyRef.current = '';
  }, [timeframe]);

  // ── Reset state on symbol change ──────────────────────────────────────────
  useEffect(() => {
    if (curLineRef.current && candleRef.current) {
      try { candleRef.current.removePriceLine(curLineRef.current); } catch { /* ok */ }
      curLineRef.current = null;
    }
    if (slLineRef.current && candleRef.current) {
      try { candleRef.current.removePriceLine(slLineRef.current); } catch { /* ok */ }
      slLineRef.current = null;
    }
    if (tpLineRef.current && candleRef.current) {
      try { candleRef.current.removePriceLine(tpLineRef.current); } catch { /* ok */ }
      tpLineRef.current = null;
    }
    lastCandleRef.current = null;
    fittedKeyRef.current = '';
    const precision = symbol.includes('=X') && !symbol.includes('USDINR') ? 4 : 2;
    candleRef.current?.applyOptions({
      priceFormat: {
        type: 'price',
        precision,
        minMove: 1 / Math.pow(10, precision),
      },
    });
    areaRef.current?.applyOptions({
      priceFormat: {
        type: 'price',
        precision,
        minMove: 1 / Math.pow(10, precision),
      },
    });
  }, [symbol]);

  // ── Load candle data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!candles.length) {
      lastCandleRef.current = null;
      try {
        candleRef.current?.setData([]);
        areaRef.current?.setData([]);
        volRef.current?.setData([]);
      } catch { /* ok */ }
      return;
    }
    // Sort and deduplicate timestamps to ensure strictly ascending order
    const sorted = [...candles].sort((a, b) => {
      const ta = typeof a.time === 'number' ? a.time : new Date(a.time as string).getTime() / 1000;
      const tb = typeof b.time === 'number' ? b.time : new Date(b.time as string).getTime() / 1000;
      return ta - tb;
    });
    const unique: Candle[] = [];
    const seen = new Set<number | string>();
    for (const c of sorted) {
      if (!seen.has(c.time)) {
        seen.add(c.time);
        unique.push(c);
      }
    }
    if (livePrice && livePrice > 0 && unique.length > 0) {
      const last = unique[unique.length - 1];
      if (last.close > 0 && Math.abs(livePrice - last.close) / last.close <= 0.5) {
        last.high = Math.max(last.high, livePrice);
        last.low  = Math.min(last.low, livePrice);
        last.close = livePrice;
      }
    }
    lastCandleRef.current = { ...unique[unique.length - 1] };
    const cdData = unique.map(c => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close }));
    const aData  = unique.map(c => ({ time: c.time as Time, value: c.close }));
    const vData  = unique.map(c => ({
      time: c.time as Time, value: c.volume ?? 0,
      color: c.close >= c.open ? 'rgba(0,230,118,0.18)' : 'rgba(255,61,113,0.18)',
    }));
    try {
      candleRef.current?.setData(cdData);
      areaRef.current?.setData(aData);
      volRef.current?.setData(vData);
    } catch { /* ok */ }

    // Position chart once per symbol/timeframe; do not fitContent on every background refresh
    const key = `${symbol}-${timeframe}`;
    if (fittedKeyRef.current !== key) {
      fittedKeyRef.current = key;
      chartRef.current?.timeScale().applyOptions({ barSpacing: 7, rightOffset: 5 });
      chartRef.current?.timeScale().scrollToRealTime();
    }
  }, [candles, symbol, timeframe]);

  // ── Tick live price onto active candle ───────────────────────────────────
  useEffect(() => {
    if (typeof livePrice !== 'number' || !isFinite(livePrice) || livePrice <= 0) return;
    const cur = lastCandleRef.current;
    if (!cur) return;

    // Price sanity check: ignore erratic or zero spikes that differ by > 50% from active close
    if (cur.close > 0 && Math.abs(livePrice - cur.close) / cur.close > 0.5) {
      return;
    }

    const stepSec = TF_SECONDS[timeframe] || 300;
    const nowSec = Math.floor(Date.now() / 1000);
    const curTime = typeof cur.time === 'number' ? cur.time : Math.floor(new Date(cur.time as string).getTime() / 1000);

    // If historical data is behind by > 2 candle steps (closed market, weekend, delayed feed),
    // update the active candle in-place rather than spawning a distant future candle that stretches the scale.
    const isHistoricalStale = (nowSec - curTime) > (stepSec * 2);
    const isNewBarDue = !isHistoricalStale && (nowSec >= curTime + stepSec);

    try {
      if (isNewBarDue) {
        // Aligned bar time for next bucket
        const nextTime = curTime + stepSec;
        const newCandle: Candle = {
          time: nextTime,
          open: cur.close,
          high: Math.max(cur.close, livePrice),
          low:  Math.min(cur.close, livePrice),
          close: livePrice,
        };
        lastCandleRef.current = newCandle;
        candleRef.current?.update({
          time: newCandle.time as Time,
          open: newCandle.open,
          high: newCandle.high,
          low:  newCandle.low,
          close: newCandle.close,
        });
        areaRef.current?.update({ time: newCandle.time as Time, value: livePrice });
      } else {
        // Still in active bar: update high/low/close smoothly without altering time or stretching bar
        cur.high  = Math.max(cur.high, livePrice);
        cur.low   = Math.min(cur.low, livePrice);
        cur.close = livePrice;

        candleRef.current?.update({
          time: cur.time as Time,
          open: cur.open,
          high: cur.high,
          low:  cur.low,
          close: cur.close,
        });
        areaRef.current?.update({ time: cur.time as Time, value: livePrice });
      }
    } catch {
      // Ignore occasional time-order collision on fast ticks
    }

    // ── Current price dotted line (green on up, red on down) ──────────────
    if (candleRef.current) {
      const isUp = livePrice >= cur.open;
      const lineColor = isUp ? '#00e676' : '#ff3d71';
      if (curLineRef.current) {
        try {
          curLineRef.current.applyOptions({
            price: livePrice,
            color: lineColor,
            axisLabelVisible: true,
          });
        } catch {
          try { candleRef.current.removePriceLine(curLineRef.current); } catch { /* ok */ }
          curLineRef.current = candleRef.current.createPriceLine({
            price: livePrice,
            color: lineColor,
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: '',
          });
        }
      } else {
        curLineRef.current = candleRef.current.createPriceLine({
          price: livePrice,
          color: lineColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: '',
        });
      }
    }
  }, [livePrice, timeframe]);

  // ── Entry price dotted line ──────────────────────────────────────────────
  useEffect(() => {
    if (!candleRef.current) return;
    if (entryLineRef.current) {
      try { candleRef.current.removePriceLine(entryLineRef.current); } catch { /* ok */ }
      entryLineRef.current = null;
    }
    if (entryPrice) {
      entryLineRef.current = candleRef.current.createPriceLine({
        price: entryPrice,
        color: '#00e676',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'ENTRY',
      });
    }
  }, [entryPrice]);

  // ── Stop Loss dashed line ────────────────────────────────────────────────
  useEffect(() => {
    if (!candleRef.current) return;
    if (slLineRef.current) {
      try { candleRef.current.removePriceLine(slLineRef.current); } catch { /* ok */ }
      slLineRef.current = null;
    }
    if (stopLoss && stopLoss > 0) {
      slLineRef.current = candleRef.current.createPriceLine({
        price: stopLoss,
        color: '#ff3d71',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'SL',
      });
    }
  }, [stopLoss]);

  // ── Take Profit dashed line ──────────────────────────────────────────────
  useEffect(() => {
    if (!candleRef.current) return;
    if (tpLineRef.current) {
      try { candleRef.current.removePriceLine(tpLineRef.current); } catch { /* ok */ }
      tpLineRef.current = null;
    }
    if (takeProfit && takeProfit > 0) {
      tpLineRef.current = candleRef.current.createPriceLine({
        price: takeProfit,
        color: '#00e676',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'TP',
      });
    }
  }, [takeProfit]);

  // ── Chart type toggle ────────────────────────────────────────────────────
  useEffect(() => {
    candleRef.current?.applyOptions({ visible: chartType === 'candle' });
    areaRef.current?.applyOptions({ visible: chartType === 'area' });
  }, [chartType]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#000', borderBottom: '1px solid var(--border-dim)', flexShrink: 0 }}>
      {/* ── Top bar: back + asset name + timeframes + chart type ────── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border-dim)', gap: 8 }}>
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            background: 'none', border: '1px solid var(--border-dim)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'var(--font-ui)', fontSize: 11, borderRadius: 0,
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={13} />
        </button>

        {/* Asset identity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>{symbol}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name} · {assetClass.toUpperCase()}
          </span>
        </div>

        {/* Chart type */}
        <div style={{ display: 'flex', border: '1px solid var(--border-dim)' }}>
          {(['candle', 'area'] as const).map(t => (
            <button key={t} onClick={() => setChartType(t)} style={{
              background: chartType === t ? 'var(--border-mid)' : 'transparent',
              color: chartType === t ? '#fff' : 'var(--text-muted)',
              border: 'none', borderRight: t === 'candle' ? '1px solid var(--border-dim)' : 'none',
              padding: '5px 9px', fontFamily: 'var(--font-ui)', fontSize: 11,
              fontWeight: 600, cursor: 'pointer',
            }}>
              {t === 'candle' ? 'OHLC' : 'LINE'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeframe row ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-dim)', padding: '0 10px', background: 'var(--bg-card)' }}>
        {TIMEFRAMES.map(tf => (
          <button key={tf} onClick={() => onTimeframeChange(tf)} style={{
            background: 'none',
            color: tf === timeframe ? 'var(--text-primary)' : 'var(--text-muted)',
            border: 'none', borderBottom: tf === timeframe ? '2px solid #fff' : '2px solid transparent',
            padding: '7px 12px', fontFamily: 'var(--font-ui)', fontSize: 11,
            fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em',
            transition: 'color 0.1s, border-color 0.1s',
          }}>
            {tf}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {/* Live price in timeframe bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 4 }}>
          {livePrice ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>
              {formatAssetPrice(livePrice, symbol)}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              {loading ? 'Loading…' : '—'}
            </span>
          )}
          <div className="live-dot" />
        </div>
      </div>

      {/* ── Canvas ───────────────────────────────────────────────── */}
      <div ref={containerRef} style={{ width: '100%', height: 300 }} />
    </div>
  );
}
