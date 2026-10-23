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
  series: ISeriesApi<'Candlestick'> | null;
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

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${symbol}`, JSON.stringify(zones));
    } catch {
      // ignore
    }
  }, [zones, symbol]);

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
    try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* ok */ }
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
            return { ...z, topPrice: Math.max(newPrice, z.bottomPrice) };
          } else {
            return { ...z, bottomPrice: Math.min(newPrice, z.topPrice) };
          }
        }));
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDrawing && dragPreview && containerRef.current && series) {
      const p1 = series.coordinateToPrice(dragPreview.startY);
      const p2 = series.coordinateToPrice(dragPreview.currentY);
      setDragPreview(null);
      try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); } catch { /* ok */ }

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
        setZones(prev => [...prev, newZone]);
        setActiveZoneId(newZone.id);
        onDrawingComplete();
      }
    }

    if (adjustingEdge) {
      setAdjustingEdge(null);
    }
  };

  const handleDeleteZone = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZones(prev => prev.filter(z => z.id !== id));
    if (activeZoneId === id) setActiveZoneId(null);
  };

  const handleToggleType = (id: string, type: 'demand' | 'supply' | 'neutral', e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZones(prev => prev.map(z => z.id === id ? {
      ...z,
      type,
      label: type === 'demand' ? 'DEMAND OB' : type === 'supply' ? 'SUPPLY OB' : 'KEY ZONE',
    } : z));
  };

  if (!series || !containerRef.current) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: isDrawing ? 'auto' : 'none',
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
          const height = Math.max(8, Math.abs(yBottom - yTop));
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
            <g key={zone.id} style={{ pointerEvents: 'auto', cursor: isDrawing ? 'crosshair' : 'pointer' }}>
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
                style={{ userSelect: 'none' }}
              >
                {zone.label || (zone.type === 'demand' ? 'DEMAND ZONE' : 'SUPPLY ZONE')} • {formatAssetPrice(zone.topPrice, symbol)} - {formatAssetPrice(zone.bottomPrice, symbol)}
              </text>

              {/* Interactive Resize Edge Handles when Selected */}
              {isSelected && (
                <>
                  <line
                    x1={0}
                    y1={topY}
                    x2="100%"
                    y2={topY}
                    stroke={strokeColor}
                    strokeWidth={4}
                    style={{ cursor: 'ns-resize' }}
                    onPointerDown={e => {
                      e.stopPropagation();
                      setAdjustingEdge({ zoneId: zone.id, edge: 'top' });
                    }}
                  />
                  <line
                    x1={0}
                    y1={topY + height}
                    x2="100%"
                    y2={topY + height}
                    stroke={strokeColor}
                    strokeWidth={4}
                    style={{ cursor: 'ns-resize' }}
                    onPointerDown={e => {
                      e.stopPropagation();
                      setAdjustingEdge({ zoneId: zone.id, edge: 'bottom' });
                    }}
                  />
                </>
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

      {/* Floating Action Menu for Selected Zone */}
      {activeZoneId && (() => {
        const zone = zones.find(z => z.id === activeZoneId);
        if (!zone) return null;
        const yTop = series.priceToCoordinate(zone.topPrice);
        if (yTop == null || isNaN(yTop)) return null;

        return (
          <div
            style={{
              position: 'absolute',
              top: `${Math.max(6, Math.min(yTop - 32, (isFullscreen ? window.innerHeight - 150 : 250)))}px`,
              left: 12,
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
            padding: '3px 10px',
            borderRadius: 12,
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            letterSpacing: '0.02em',
          }}
        >
          ▭ Drag on chart to draw Zone
        </div>
      )}
    </div>
  );
}
