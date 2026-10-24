import { useEffect, useRef, useState } from 'react';
import {
  createChart, ColorType, CrosshairMode, LineStyle,
  CandlestickSeries, AreaSeries, HistogramSeries,
  type IChartApi, type ISeriesApi, type Time, type IPriceLine,
} from 'lightweight-charts';
import { ArrowLeft, Maximize2, Minimize2, X, MoveVertical } from 'lucide-react';
import type { Candle, Timeframe } from '../types/market';
import type { Position, Order } from '../types/trade';
import { formatAssetPrice, getAssetUSDMultiplier } from '../utils/formatPrice';
import { calculatePotentialPnL, formatPotentialPnL } from '../core/trading/lots';
import { ChartDrawingOverlay } from './ChartDrawingOverlay';

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
  rawSymbol?: string;
  orders?: Order[];
  onCancelOrder?: (orderId: string) => void;
  onUpdateLimitOrderPrice?: (orderId: string, newPrice: number) => void;
  activePosition?: Position;
  onUpdateSLTP?: (posId: string, sl?: number, tp?: number) => void;
}

export function TradingViewChart({
  symbol, name, assetClass, candles, livePrice, entryPrice, stopLoss, takeProfit,
  timeframe, onTimeframeChange, loading, onBack,
  rawSymbol, orders, onCancelOrder, onUpdateLimitOrderPrice, activePosition, onUpdateSLTP,
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
  const orderLinesRef = useRef<Record<string, IPriceLine>>({});
  const [chartType, setChartType] = useState<'candle' | 'area'>('candle');
  const [countdown, setCountdown] = useState<string>('00:00');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [draggingOrder, setDraggingOrder] = useState<{ id: string; price: number; side: string } | null>(null);
  const [draggingSLTP, setDraggingSLTP] = useState<{ type: 'sl' | 'tp'; price: number } | null>(null);
  const [isDrawingZone, setIsDrawingZone] = useState<boolean>(false);
  const [showTradeLevels, setShowTradeLevels] = useState<boolean>(() => {
    try { return localStorage.getItem('dt_show_trade_levels') !== 'false'; } catch { return true; }
  });
  const [, setRenderTrigger] = useState(0);

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
    for (const line of Object.values(orderLinesRef.current)) {
      try { candleRef.current?.removePriceLine(line); } catch { /* ok */ }
    }
    orderLinesRef.current = {};
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
      if (last.close > 0 && Math.abs(livePrice - last.close) / last.close <= 0.05) {
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
    if (entryPrice && showTradeLevels) {
      entryLineRef.current = candleRef.current.createPriceLine({
        price: entryPrice,
        color: '#00e676',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'ENTRY',
      });
    }
  }, [entryPrice, showTradeLevels]);

  // ── Stop Loss dashed line ────────────────────────────────────────────────
  useEffect(() => {
    if (!candleRef.current) return;
    if (slLineRef.current) {
      try { candleRef.current.removePriceLine(slLineRef.current); } catch { /* ok */ }
      slLineRef.current = null;
    }
    if (stopLoss && stopLoss > 0 && showTradeLevels) {
      slLineRef.current = candleRef.current.createPriceLine({
        price: stopLoss,
        color: '#ff3d71',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '',
      });
    }
  }, [stopLoss, activePosition, rawSymbol, symbol, assetClass, showTradeLevels]);

  // ── Take Profit dashed line ──────────────────────────────────────────────
  useEffect(() => {
    if (!candleRef.current) return;
    if (tpLineRef.current) {
      try { candleRef.current.removePriceLine(tpLineRef.current); } catch { /* ok */ }
      tpLineRef.current = null;
    }
    if (takeProfit && takeProfit > 0 && showTradeLevels) {
      tpLineRef.current = candleRef.current.createPriceLine({
        price: takeProfit,
        color: '#00e676',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '',
      });
    }
  }, [takeProfit, activePosition, rawSymbol, symbol, assetClass, showTradeLevels]);

  // ── Live-sync SL/TP price lines while dragging ──────────────────────────
  useEffect(() => {
    if (!draggingSLTP) return;
    if (draggingSLTP.type === 'sl' && slLineRef.current) {
      try {
        slLineRef.current.applyOptions({
          price: draggingSLTP.price,
          title: '',
        });
      } catch { /* ok */ }
    }
    if (draggingSLTP.type === 'tp' && tpLineRef.current) {
      try {
        tpLineRef.current.applyOptions({
          price: draggingSLTP.price,
          title: '',
        });
      } catch { /* ok */ }
    }
  }, [draggingSLTP]);

  // ── Chart type toggle ────────────────────────────────────────────────────
  useEffect(() => {
    candleRef.current?.applyOptions({ visible: chartType === 'candle' });
    areaRef.current?.applyOptions({ visible: chartType === 'area' });
  }, [chartType]);

  // ── Countdown Timer for Current Candle ──────────────────────────────────
  useEffect(() => {
    const updateCountdown = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const tfSec = TF_SECONDS[timeframe] || 60;
      const remaining = (Math.floor(nowSec / tfSec) + 1) * tfSec - nowSec;
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      if (remaining >= 3600) {
        const hrs = Math.floor(remaining / 3600);
        const remMins = Math.floor((remaining % 3600) / 60);
        setCountdown(`${String(hrs).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      } else {
        setCountdown(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [timeframe]);

  // ── Fullscreen resize handling ──────────────────────────────────────────
  useEffect(() => {
    if (chartRef.current && containerRef.current) {
      const h = isFullscreen ? window.innerHeight - 90 : 300;
      const w = isFullscreen ? window.innerWidth : (containerRef.current.clientWidth || 360);
      chartRef.current.applyOptions({ height: h, width: w });
    }
  }, [isFullscreen]);

  // ── Pending Orders Price Lines ──────────────────────────────────────────
  const basePendingOrders = (orders || []).filter(
    o => (o.symbol === symbol || (rawSymbol && o.symbol === rawSymbol)) && o.status === 'pending' && o.limitPrice
  );
  const pendingOrders = [...basePendingOrders];
  if (activePosition?.stopLoss && activePosition.stopLoss > 0 && !basePendingOrders.some(o => o.type === 'stop_loss' && (o.positionId === activePosition.id || o.symbol === (rawSymbol || symbol)))) {
    pendingOrders.push({
      id: `virtual-sl-${activePosition.id}`,
      accountId: activePosition.accountId,
      symbol: rawSymbol || symbol,
      side: activePosition.side === 'short' ? 'buy' : 'sell',
      type: 'stop_loss',
      quantity: activePosition.quantity,
      lot: activePosition.lot,
      limitPrice: activePosition.stopLoss,
      positionId: activePosition.id,
      status: 'pending',
      createdAt: 0,
    });
  }
  if (activePosition?.takeProfit && activePosition.takeProfit > 0 && !basePendingOrders.some(o => o.type === 'take_profit' && (o.positionId === activePosition.id || o.symbol === (rawSymbol || symbol)))) {
    pendingOrders.push({
      id: `virtual-tp-${activePosition.id}`,
      accountId: activePosition.accountId,
      symbol: rawSymbol || symbol,
      side: activePosition.side === 'short' ? 'buy' : 'sell',
      type: 'take_profit',
      quantity: activePosition.quantity,
      lot: activePosition.lot,
      limitPrice: activePosition.takeProfit,
      positionId: activePosition.id,
      status: 'pending',
      createdAt: 0,
    });
  }

  useEffect(() => {
    if (!candleRef.current) return;

    // When POSITIONS hidden: clear all canvas order lines
    if (!showTradeLevels) {
      for (const [id, line] of Object.entries(orderLinesRef.current)) {
        try { candleRef.current.removePriceLine(line); } catch { /* ok */ }
        delete orderLinesRef.current[id];
      }
      return;
    }

    const currentIds = new Set(pendingOrders.map(o => o.id));
    for (const [id, line] of Object.entries(orderLinesRef.current)) {
      if (!currentIds.has(id)) {
        try { candleRef.current.removePriceLine(line); } catch { /* ok */ }
        delete orderLinesRef.current[id];
      }
    }

    for (const ord of pendingOrders) {
      // Do not create duplicate canvas lines if slLineRef or tpLineRef already manages the position SL/TP
      if (ord.type === 'stop_loss' && slLineRef.current) continue;
      if (ord.type === 'take_profit' && tpLineRef.current) continue;

      const isTp = ord.type === 'take_profit';
      const isSl = ord.type === 'stop_loss';
      const isBuy = ord.side === 'buy';
      const color = isTp ? '#00e676' : isSl ? '#ff3d71' : (isBuy ? '#00e676' : '#ff3d71');
      const price = draggingOrder?.id === ord.id
        ? draggingOrder.price
        : (isSl && draggingSLTP?.type === 'sl' ? draggingSLTP.price : (isTp && draggingSLTP?.type === 'tp' ? draggingSLTP.price : ord.limitPrice!));
      const existing = orderLinesRef.current[ord.id];
      if (existing) {
        try {
          existing.applyOptions({ price, color, title: '' });
        } catch { /* ok */ }
      } else {
        try {
          orderLinesRef.current[ord.id] = candleRef.current.createPriceLine({
            price,
            color,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: '',
          });
        } catch { /* ok */ }
      }
    }
  }, [pendingOrders, draggingOrder, draggingSLTP, showTradeLevels]);

  // ── Pointer Drag Event Handlers for Orders & SL/TP ───────────────────────
  const handleStartSLTPDrag = (e: React.PointerEvent, type: 'sl' | 'tp', price: number, linkedOrder?: Order) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDraggingSLTP({ type, price });
    const ord = linkedOrder || pendingOrders.find(o => o.type === (type === 'sl' ? 'stop_loss' : 'take_profit'));
    if (ord) {
      setDraggingOrder({ id: ord.id, price, side: ord.side });
    }
  };

  const handleStartOrderDrag = (e: React.PointerEvent, ord: Order) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (ord.type === 'stop_loss') {
      handleStartSLTPDrag(e, 'sl', ord.limitPrice!, ord);
    } else if (ord.type === 'take_profit') {
      handleStartSLTPDrag(e, 'tp', ord.limitPrice!, ord);
    } else {
      setDraggingOrder({ id: ord.id, price: ord.limitPrice!, side: ord.side });
    }
  };

  const handlePointerMoveContainer = (e: React.PointerEvent) => {
    if (!containerRef.current || !candleRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const yCoord = e.clientY - rect.top;
    const newPrice = candleRef.current.coordinateToPrice(yCoord);
    if (newPrice && newPrice > 0) {
      if (draggingSLTP) {
        let safePrice = Number(newPrice);
        if (activePosition && activePosition.entryPriceUSD > 0) {
          const isLong = activePosition.side !== 'short';
          const entry = activePosition.entryPriceUSD;
          if (draggingSLTP.type === 'sl') {
            safePrice = isLong ? Math.min(safePrice, entry * 0.9998) : Math.max(safePrice, entry * 1.0002);
          } else if (draggingSLTP.type === 'tp') {
            safePrice = isLong ? Math.max(safePrice, entry * 1.0002) : Math.min(safePrice, entry * 0.9998);
          }
        }
        setDraggingSLTP(prev => prev ? { ...prev, price: safePrice } : null);
        if (draggingOrder) {
          setDraggingOrder(prev => prev ? { ...prev, price: safePrice } : null);
        }
      } else if (draggingOrder) {
        setDraggingOrder(prev => prev ? { ...prev, price: newPrice } : null);
      }
    }
  };

  const handlePointerUpContainer = () => {
    if (draggingSLTP && activePosition) {
      if (draggingSLTP.type === 'sl') {
        onUpdateSLTP?.(activePosition.id, draggingSLTP.price, activePosition.takeProfit);
      } else {
        onUpdateSLTP?.(activePosition.id, activePosition.stopLoss, draggingSLTP.price);
      }
    }
    if (draggingOrder) {
      onUpdateLimitOrderPrice?.(draggingOrder.id, draggingOrder.price);
    }
    setDraggingOrder(null);
    setDraggingSLTP(null);
  };

  return (
    <div
      className={isFullscreen ? 'chart-fullscreen-pro' : ''}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#000',
        borderBottom: isFullscreen ? 'none' : '1px solid var(--border-dim)',
        flexShrink: 0,
      }}
      onPointerMove={handlePointerMoveContainer}
      onPointerUp={handlePointerUpContainer}
      onPointerCancel={handlePointerUpContainer}
    >
      {/* ── Top bar: back + asset name + timeframes + chart type ────── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border-dim)', gap: 8 }}>
        {/* Back button */}
        <button
          onClick={isFullscreen ? () => setIsFullscreen(false) : onBack}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>{symbol}</span>
            {isFullscreen && (
              <span className="badge badge-neutral" style={{ fontSize: 9, padding: '1px 5px' }}>
                FULLSCREEN
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name} · {assetClass.toUpperCase()}
          </span>
        </div>

        {/* Drawing & Chart Type Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setIsDrawingZone(prev => !prev)}
            style={{
              background: isDrawingZone ? 'rgba(59, 130, 246, 0.22)' : 'transparent',
              color: isDrawingZone ? '#3b82f6' : 'var(--text-muted)',
              border: `1px solid ${isDrawingZone ? '#3b82f6' : 'var(--border-dim)'}`,
              padding: '5px 8px',
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Draw Order Block / Supply & Demand Zone"
          >
            <span>▭</span> {isDrawingZone ? 'DRAWING' : 'ZONE'}
          </button>

          {/* POSITIONS toggle — show/hide entry, SL, TP, limit orders */}
          <button
            onClick={() => setShowTradeLevels(prev => {
              const next = !prev;
              try { localStorage.setItem('dt_show_trade_levels', String(next)); } catch {}
              return next;
            })}
            style={{
              background: showTradeLevels ? 'rgba(0, 230, 118, 0.12)' : 'transparent',
              color: showTradeLevels ? '#00e676' : 'var(--text-muted)',
              border: `1px solid ${showTradeLevels ? '#00e676' : 'var(--border-dim)'}`,
              padding: '5px 8px',
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Show / hide entry, stop loss, take profit, and limit order levels"
          >
            POSITIONS
          </button>
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
      </div>

      {/* ── Timeframe row (Split: scrollable TFs on left, pinned countdown + price on right) ────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-dim)',
        padding: '0 8px', background: 'var(--bg-card)',
        minWidth: 0,
      }}>
        {/* Scrollable timeframes */}
        <div style={{
          display: 'flex', alignItems: 'center', overflowX: 'auto', whiteSpace: 'nowrap',
          scrollbarWidth: 'none', flex: 1, minWidth: 0,
        }}>
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => onTimeframeChange(tf)} style={{
              background: 'none',
              color: tf === timeframe ? 'var(--text-primary)' : 'var(--text-muted)',
              border: 'none', borderBottom: tf === timeframe ? '2px solid #fff' : '2px solid transparent',
              padding: '7px 8px', fontFamily: 'var(--font-ui)', fontSize: 11,
              fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em',
              transition: 'color 0.1s, border-color 0.1s',
              flexShrink: 0,
            }}>
              {tf}
            </button>
          ))}
        </div>

        {/* Permanently visible countdown + live price (never pushed off-screen) */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingLeft: 6,
        }}>
          {/* Candle Countdown pill */}
          <span
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              color: 'var(--text-primary)', background: 'var(--bg-hover)',
              padding: '2px 6px', border: '1px solid var(--border-dim)',
              display: 'flex', alignItems: 'center', gap: 4,
              flexShrink: 0,
            }}
            title="Time until current candle closes"
          >
            <span style={{ color: 'var(--accent, #3b82f6)' }}>⏱</span> {countdown}
          </span>

          {/* Live price in timeframe bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {livePrice ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>
                {formatAssetPrice(livePrice, symbol)}
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {loading ? '…' : '—'}
              </span>
            )}
            <div className="live-dot" />
          </div>
        </div>
      </div>

      {/* ── Canvas Container with Floating Overlays ────────────────── */}
      <div style={{ position: 'relative', width: '100%', flex: isFullscreen ? 1 : 'none', height: isFullscreen ? 'auto' : 300, overflow: 'hidden' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Native Order Blocks & Supply/Demand Zones Drawing Overlay */}
        <ChartDrawingOverlay
          chart={chartRef.current}
          series={(chartType === 'area' ? areaRef.current : candleRef.current) as any}
          symbol={rawSymbol || symbol}
          isDrawing={isDrawingZone}
          onDrawingComplete={() => setIsDrawingZone(false)}
          containerRef={containerRef}
          isFullscreen={isFullscreen}
        />

        {/* Price scale countdown tag (beneath price scale active price) */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            right: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            borderLeft: '2px solid var(--accent, #3b82f6)',
            padding: '2px 6px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: '#ffffff',
            pointerEvents: 'none',
            zIndex: 10,
            letterSpacing: '0.03em',
          }}
        >
          ⏱ {countdown}
        </div>

        {/* ENTRY anchor chip — shown when position active and levels visible */}
        {showTradeLevels && activePosition && entryPrice && (() => {
          const yCoord = candleRef.current?.priceToCoordinate(entryPrice);
          if (yCoord == null || isNaN(yCoord as number)) return null;
          return (
            <div style={{
              position: 'absolute',
              top: `${Math.max(4, Math.min(yCoord - 12, (isFullscreen ? window.innerHeight - 130 : 270)))}px`,
              left: 8, zIndex: 25,
              display: 'flex', alignItems: 'center',
              background: '#0d0d12', border: '1px solid #00e676',
              borderRadius: 4, padding: '2px 7px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.9)', userSelect: 'none',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#00e676' }}>
                ENTRY {formatAssetPrice(entryPrice, rawSymbol || symbol)}
              </span>
            </div>
          );
        })()}

        {/* Pending Orders & SL/TP Draggable Chips — gated behind POSITIONS toggle */}
        {showTradeLevels && pendingOrders.map(ord => {
          const isSL = ord.type === 'stop_loss';
          const isTP = ord.type === 'take_profit';
          const isBuy = ord.side === 'buy';

          let displayPrice = ord.limitPrice!;
          if (draggingOrder?.id === ord.id) {
            displayPrice = draggingOrder.price;
          } else if (isSL && draggingSLTP?.type === 'sl') {
            displayPrice = draggingSLTP.price;
          } else if (isTP && draggingSLTP?.type === 'tp') {
            displayPrice = draggingSLTP.price;
          }

          const yCoord = candleRef.current?.priceToCoordinate(displayPrice);
          if (yCoord === null || yCoord === undefined || isNaN(yCoord)) return null;

          const chipColor = isTP ? '#00e676' : isSL ? '#ff3d71' : (isBuy ? '#00e676' : '#ff3d71');
          const effectiveLot = ord.lot ?? activePosition?.lot;
          const effectiveQty = ord.quantity ?? activePosition?.quantity;
          const sizeLabel = effectiveLot ? `${effectiveLot}L` : `${effectiveQty}u`;

          let labelText = '';
          if (isTP || isSL) {
            const pot = activePosition ? calculatePotentialPnL(
              activePosition.entryPriceUSD || entryPrice || 0,
              displayPrice,
              activePosition.side || (ord.side === 'sell' ? 'long' : 'short'),
              effectiveLot,
              effectiveQty,
              rawSymbol || symbol,
              assetClass
            ) : 0;
            const pnlStr = formatPotentialPnL(pot);
            const priceStr = formatAssetPrice(displayPrice, rawSymbol || symbol);
            const lotPart = effectiveLot ? ` • ${effectiveLot}L` : '';
            labelText = isTP ? `TP ${pnlStr} (${priceStr}${lotPart})` : `SL ${pnlStr} (${priceStr}${lotPart})`;
          } else {
            labelText = `${isBuy ? 'BUY LMT' : 'SELL LMT'} ${sizeLabel}`;
            if (draggingOrder?.id === ord.id) {
              labelText += ` • ${formatAssetPrice(displayPrice, rawSymbol || symbol)}`;
            }
          }

          return (
            <div
              key={ord.id}
              style={{
                position: 'absolute',
                top: `${Math.max(4, Math.min(yCoord - 12, (isFullscreen ? window.innerHeight - 130 : 270)))}px`,
                left: 8,
                zIndex: 25,
                display: 'flex',
                alignItems: 'center',
                background: '#0d0d12',
                border: `1px solid ${chipColor}`,
                borderRadius: 4,
                padding: '2px 7px',
                gap: 6,
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.9)',
                userSelect: 'none',
              }}
            >
              <div
                onPointerDown={e => handleStartOrderDrag(e, ord)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, cursor: 'ns-resize', touchAction: 'none',
                }}
                title={isSL ? "Drag to adjust Stop Loss" : isTP ? "Drag to adjust Take Profit" : "Drag up/down to adjust limit price"}
              >
                <MoveVertical size={11} color={chipColor} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: chipColor }}>
                  {labelText}
                </span>
              </div>
              {onCancelOrder && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (!ord.id.startsWith('virtual-')) {
                      onCancelOrder(ord.id);
                    }
                    if (isSL && activePosition) {
                      onUpdateSLTP?.(activePosition.id, undefined, activePosition.takeProfit);
                    } else if (isTP && activePosition) {
                      onUpdateSLTP?.(activePosition.id, activePosition.stopLoss, undefined);
                    }
                  }}
                  style={{
                    background: 'transparent', border: 'none', padding: 0,
                    cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                  }}
                  title={isSL ? "Cancel Stop Loss" : isTP ? "Cancel Take Profit" : "Cancel Limit Order"}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}

        {/* Floating Fullscreen / Minimize Toggle Button */}
        <button
          onClick={() => setIsFullscreen(prev => !prev)}
          className="btn btn-ghost"
          style={{
            position: 'absolute',
            bottom: 34,
            right: 68,
            zIndex: 30,
            background: 'rgba(24, 24, 27, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            padding: '5px 7px',
            borderRadius: 4,
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isFullscreen ? 'Minimize Chart' : 'Fullscreen Chart'}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
    </div>
  );
}
