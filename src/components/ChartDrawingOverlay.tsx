import { useState, useEffect } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { Trash2, X } from 'lucide-react';
import { formatAssetPrice } from '../utils/formatPrice';

export interface ChartZone {
  id: string;
  topPrice: number;
  bottomPrice: number;
  type: 'demand' | 'supply' | 'neutral';
  label?: string;
}

interface Props {
  chart: IChartApi | null;
  series: ISeriesApi<any> | null;
  symbol: string;
  isDrawing: boolean;
  onDrawingComplete: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isFullscreen?: boolean;
}

const STORAGE_KEY_PREFIX = 'dt_chart_zones_';

export function ChartDrawingOverlay({
  chart,
  series,
  symbol,
  isDrawing,
  onDrawingComplete,
  containerRef,
  isFullscreen,
}: Props) {
  const [zones, setZones] = useState<ChartZone[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${symbol}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ startY: number; currentY: number } | null>(null);
  const [adjustingEdge, setAdjustingEdge] = useState<{ zoneId: string; edge: 'top' | 'bottom' } | null>(null);
  const [, setRenderTrigger] = useState(0);

  // Reload when symbol changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${symbol}`);
      setZones(saved ? JSON.parse(saved) : []);
    } catch {
      setZones([]);
    }
    setActiveZoneId(null);
  }, [symbol]);

  // Force re-render overlay whenever chart zooms or scrolls
  useEffect(() => {
    if (!chart) return;
    const handleRangeChange = () => {
      setRenderTrigger(prev => prev + 1);
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    return () => {
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      } catch {
        // ignore
      }
    };
  }, [chart]);

  // Pointer events for drawing new zone
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isDrawing || !containerRef.current || !series) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDragPreview({ startY: y, currentY: y });
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ok */ }
  };

  // Start stretching top or bottom edge of an existing zone
  const handleEdgePointerDown = (e: React.PointerEvent, zoneId: string, edge: 'top' | 'bottom') => {
    e.stopPropagation();
    setAdjustingEdge({ zoneId, edge });
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); } catch { /* ok */ }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current || !series) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;

    if (isDrawing && dragPreview) {
      setDragPreview(prev => prev ? { ...prev, currentY: y } : null);
    } else if (adjustingEdge) {
      const newPrice = series.coordinateToPrice(y);
      if (newPrice && newPrice > 0) {
        setZones(prev => prev.map(z => {
          if (z.id !== adjustingEdge.zoneId) return z;
          if (adjustingEdge.edge === 'top') {
            if (newPrice < z.bottomPrice) {
              setAdjustingEdge({ zoneId: z.id, edge: 'bottom' });
              return { ...z, topPrice: z.bottomPrice, bottomPrice: newPrice };
            }
            return { ...z, topPrice: newPrice };
          } else {
            if (newPrice > z.topPrice) {
              setAdjustingEdge({ zoneId: z.id, edge: 'top' });
              return { ...z, bottomPrice: z.topPrice, topPrice: newPrice };
            }
            return { ...z, bottomPrice: newPrice };
          }
        }));
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch { /* ok */ }
    if (isDrawing && dragPreview && containerRef.current && series) {
      const p1 = series.coordinateToPrice(dragPreview.startY);
      const p2 = series.coordinateToPrice(dragPreview.currentY);
      setDragPreview(null);

      if (p1 && p2 && Math.abs(p1 - p2) > 0) {
        const top = Math.max(p1, p2);
        const bottom = Math.min(p1, p2);
        const newZone: ChartZone = {
          id: `zone_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          topPrice: top,
          bottomPrice: bottom,
          type: dragPreview.startY > dragPreview.currentY ? 'supply' : 'demand',
          label: dragPreview.startY > dragPreview.currentY ? 'SUPPLY OB' : 'DEMAND OB',
        };
        const nextZones = [...zones, newZone];
        setZones(nextZones);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}${symbol}`, JSON.stringify(nextZones)); } catch { /* ok */ }
        setActiveZoneId(newZone.id);
        onDrawingComplete();
      }
    }

    if (adjustingEdge) {
      setAdjustingEdge(null);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}${symbol}`, JSON.stringify(zones)); } catch { /* ok */ }
    }
  };

  const handleDeleteZone = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextZones = zones.filter(z => z.id !== id);
    setZones(nextZones);
    try { localStorage.setItem(`${STORAGE_KEY_PREFIX}${symbol}`, JSON.stringify(nextZones)); } catch { /* ok */ }
    if (activeZoneId === id) setActiveZoneId(null);
  };

  const handleToggleType = (id: string, type: 'demand' | 'supply' | 'neutral', e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextZones = zones.map(z => z.id === id ? {
      ...z,
      type,
      label: type === 'demand' ? 'DEMAND OB' : type === 'supply' ? 'SUPPLY OB' : 'KEY ZONE',
    } : z);
    setZones(nextZones);
    try { localStorage.setItem(`${STORAGE_KEY_PREFIX}${symbol}`, JSON.stringify(nextZones)); } catch { /* ok */ }
  };

  if (!series || !containerRef.current) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: isDrawing || adjustingEdge !== null ? 'auto' : 'none',
        touchAction: 'none',
        zIndex: 20,
        overflow: 'hidden',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
        }}
      >
        <defs>
          <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e676" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#00e676" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="supplyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff3d71" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ff3d71" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="neutralGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Existing Persistent Zones */}
        {zones.map(zone => {
          const yTop = series.priceToCoordinate(zone.topPrice);
          const yBottom = series.priceToCoordinate(zone.bottomPrice);
          if (yTop == null || yBottom == null || isNaN(yTop) || isNaN(yBottom)) return null;

          const topY = Math.min(yTop, yBottom);
          const height = Math.max(10, Math.abs(yBottom - yTop));
          const isSelected = activeZoneId === zone.id;

          const strokeColor = zone.type === 'demand'
            ? '#00e676'
            : zone.type === 'supply'
            ? '#ff3d71'
            : '#3b82f6';

          const fillId = zone.type === 'demand'
            ? 'url(#demandGrad)'
            : zone.type === 'supply'
            ? 'url(#supplyGrad)'
            : 'url(#neutralGrad)';

          return (
            <g key={zone.id} style={{ pointerEvents: 'auto', touchAction: 'none' }}>
              {/* Main Zone Box */}
              <rect
                x={0}
                y={topY}
                width="100%"
                height={height}
                fill={fillId}
                stroke={strokeColor}
                strokeWidth={isSelected ? 1.5 : 1}
                strokeDasharray={isSelected ? '4,2' : undefined}
                style={{ cursor: isDrawing ? 'crosshair' : 'pointer' }}
                onClick={e => {
                  e.stopPropagation();
                  setActiveZoneId(prev => prev === zone.id ? null : zone.id);
                }}
              />

              {/* Zone Tag / Badge */}
              <text
                x={8}
                y={topY + 13}
                fill={strokeColor}
                fontSize={9}
                fontFamily="var(--font-mono)"
                fontWeight={700}
                letterSpacing="0.04em"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {zone.label || (zone.type === 'demand' ? 'DEMAND ZONE' : 'SUPPLY ZONE')} • {formatAssetPrice(zone.topPrice, symbol)} - {formatAssetPrice(zone.bottomPrice, symbol)}
              </text>

              {/* Interactive Resize Edge Handles when Selected */}
              {isSelected && (
                <g style={{ touchAction: 'none' }}>
                  {/* Top Edge Resize Group */}
                  <g
                    style={{ cursor: 'ns-resize', touchAction: 'none' }}
                    onPointerDown={e => handleEdgePointerDown(e, zone.id, 'top')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    {/* 32px Generous Invisible Hit Target for Finger / Mouse */}
                    <line
                      x1={0}
                      y1={topY}
                      x2="100%"
                      y2={topY}
                      stroke="transparent"
                      strokeWidth={32}
                    />
                    {/* Visual Dashed Line */}
                    <line
                      x1={0}
                      y1={topY}
                      x2="100%"
                      y2={topY}
                      stroke={strokeColor}
                      strokeWidth={2}
                      strokeDasharray="4,3"
                    />
                    {/* Centered Visual Grab Pill */}
                    <rect
                      x="calc(50% - 24px)"
                      y={topY - 4}
                      width={48}
                      height={8}
                      rx={4}
                      fill={strokeColor}
                      stroke="#000000"
                      strokeWidth={1.5}
                    />
                  </g>

                  {/* Bottom Edge Resize Group */}
                  <g
                    style={{ cursor: 'ns-resize', touchAction: 'none' }}
                    onPointerDown={e => handleEdgePointerDown(e, zone.id, 'bottom')}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    {/* 32px Generous Invisible Hit Target for Finger / Mouse */}
                    <line
                      x1={0}
                      y1={topY + height}
                      x2="100%"
                      y2={topY + height}
                      stroke="transparent"
                      strokeWidth={32}
                    />
                    {/* Visual Dashed Line */}
                    <line
                      x1={0}
                      y1={topY + height}
                      x2="100%"
                      y2={topY + height}
                      stroke={strokeColor}
                      strokeWidth={2}
                      strokeDasharray="4,3"
                    />
                    {/* Centered Visual Grab Pill */}
                    <rect
                      x="calc(50% - 24px)"
                      y={topY + height - 4}
                      width={48}
                      height={8}
                      rx={4}
                      fill={strokeColor}
                      stroke="#000000"
                      strokeWidth={1.5}
                    />
                  </g>
                </g>
              )}
            </g>
          );
        })}

        {/* Live Drawing Preview Box */}
        {isDrawing && dragPreview && (
          <rect
            x={0}
            y={Math.min(dragPreview.startY, dragPreview.currentY)}
            width="100%"
            height={Math.max(4, Math.abs(dragPreview.currentY - dragPreview.startY))}
            fill="rgba(59, 130, 246, 0.25)"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />
        )}
      </svg>

      {/* Floating Action Menu for Selected Zone (hidden while actively dragging edges) */}
      {activeZoneId && !adjustingEdge && !isDrawing && (() => {
        const zone = zones.find(z => z.id === activeZoneId);
        if (!zone) return null;
        const yTop = series.priceToCoordinate(zone.topPrice);
        const yBottom = series.priceToCoordinate(zone.bottomPrice);
        if (yTop == null || isNaN(yTop)) return null;

        const minY = Math.min(yTop, yBottom ?? yTop);
        const maxY = Math.max(yTop, yBottom ?? yTop);
        // Position cleanly above zone if room, or below if near top
        const menuTop = minY > 54 ? minY - 38 : maxY + 14;

        return (
          <div
            style={{
              position: 'absolute',
              top: `${Math.max(8, Math.min(menuTop, (isFullscreen ? window.innerHeight - 150 : 250)))}px`,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 35,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(10, 10, 14, 0.94)',
              border: '1px solid var(--border-mid)',
              borderRadius: 5,
              padding: '3px 6px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
              pointerEvents: 'auto',
              touchAction: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <button
              onClick={e => handleToggleType(zone.id, 'demand', e)}
              style={{
                background: zone.type === 'demand' ? 'rgba(0, 230, 118, 0.2)' : 'transparent',
                border: zone.type === 'demand' ? '1px solid #00e676' : '1px solid transparent',
                color: '#00e676',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 3,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              DEMAND
            </button>
            <button
              onClick={e => handleToggleType(zone.id, 'supply', e)}
              style={{
                background: zone.type === 'supply' ? 'rgba(255, 61, 113, 0.2)' : 'transparent',
                border: zone.type === 'supply' ? '1px solid #ff3d71' : '1px solid transparent',
                color: '#ff3d71',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 3,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              SUPPLY
            </button>
            <div style={{ width: 1, height: 14, background: 'var(--border-dim)' }} />
            <button
              onClick={e => handleDeleteZone(zone.id, e)}
              style={{
                background: 'rgba(255, 61, 113, 0.15)',
                border: 'none',
                color: '#ff3d71',
                padding: '3px 5px',
                borderRadius: 3,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Delete Zone"
            >
              <Trash2 size={12} />
            </button>
            <button
              onClick={() => setActiveZoneId(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                padding: '2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Close menu"
            >
              <X size={12} />
            </button>
          </div>
        );
      })()}

      {/* Drawing mode guide banner */}
      {isDrawing && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(59, 130, 246, 0.92)',
            color: '#fff',
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: 14,
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          ▭ Drag on chart to draw Zone
        </div>
      )}
    </div>
  );
}
