import { useState, useEffect } from 'react';
import { Minus, Plus, AlertCircle } from 'lucide-react';
import {
  LOT_PRESETS,
  MIN_LOT,
  MAX_LOT,
  LOT_STEP,
  getContractSize,
  calculateRequiredMargin,
  formatLot,
} from '../core/trading/lots';
import { formatCurrency } from '../services/storage';

interface Props {
  lot: number;
  onChange: (lot: number) => void;
  price: number;
  symbol: string;
  assetClass?: string;
  availableCashUSD?: number;
  userCurrency?: string;
}

export function LotSelector({
  lot,
  onChange,
  price,
  symbol,
  assetClass,
  availableCashUSD,
  userCurrency = 'USD',
}: Props) {
  const [inputValue, setInputValue] = useState<string>(lot.toFixed(2));

  // Sync internal input string when external lot prop changes
  useEffect(() => {
    setInputValue(lot.toFixed(2));
  }, [lot]);

  const contractSize = getContractSize(symbol, assetClass);
  const units = Number((lot * contractSize).toFixed(4));
  const requiredMargin = calculateRequiredMargin(lot, price, symbol, assetClass);
  const isInsufficient = availableCashUSD != null && requiredMargin > availableCashUSD;

  const handleStep = (delta: number) => {
    const next = Number(Math.min(MAX_LOT, Math.max(MIN_LOT, lot + delta)).toFixed(2));
    onChange(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= MIN_LOT && parsed <= MAX_LOT) {
      onChange(Number(parsed.toFixed(2)));
    }
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed < MIN_LOT) {
      onChange(MIN_LOT);
      setInputValue(MIN_LOT.toFixed(2));
    } else if (parsed > MAX_LOT) {
      onChange(MAX_LOT);
      setInputValue(MAX_LOT.toFixed(2));
    } else {
      const fixed = Number(parsed.toFixed(2));
      onChange(fixed);
      setInputValue(fixed.toFixed(2));
    }
  };

  const cleanSymbol = symbol.replace('.NS', '').replace('USDT', '').replace('=X', '');

  return (
    <div className="col gap-2" style={{ marginBottom: 12 }}>
      {/* Header Label & Units preview */}
      <div className="row between" style={{ alignItems: 'baseline' }}>
        <label
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          LOT SIZE
        </label>
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--text-secondary)' }}
        >
          {units.toLocaleString()} {cleanSymbol}
        </span>
      </div>

      {/* Main Stepper Row */}
      <div
        className="row"
        style={{
          border: '1px solid var(--border-mid)',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius)',
          alignItems: 'stretch',
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => handleStep(-LOT_STEP)}
          disabled={lot <= MIN_LOT}
          style={{
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            borderRight: '1px solid var(--border-dim)',
            color: lot <= MIN_LOT ? 'var(--text-muted)' : 'var(--text-primary)',
            cursor: lot <= MIN_LOT ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Decrease lot"
        >
          <Minus size={15} />
        </button>

        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            className="mono font-bold"
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            step="0.01"
            min={MIN_LOT}
            max={MAX_LOT}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              textAlign: 'center',
              color: 'var(--text-primary)',
              fontSize: 16,
              padding: '8px',
              outline: 'none',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: 12,
              fontFamily: 'var(--font-ui)',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              pointerEvents: 'none',
            }}
          >
            LOT
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleStep(LOT_STEP)}
          disabled={lot >= MAX_LOT}
          style={{
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            borderLeft: '1px solid var(--border-dim)',
            color: lot >= MAX_LOT ? 'var(--text-muted)' : 'var(--text-primary)',
            cursor: lot >= MAX_LOT ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Increase lot"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Preset Chips */}
      <div
        className="row gap-1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          marginTop: 2,
        }}
      >
        {LOT_PRESETS.map(preset => {
          const isActive = Math.abs(lot - preset) < 0.001;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              style={{
                padding: '6px 0',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                fontWeight: isActive ? 700 : 500,
                textAlign: 'center',
                background: isActive ? 'var(--text-primary)' : 'var(--bg-subtle)',
                color: isActive ? '#000000' : 'var(--text-secondary)',
                border: `1px solid ${isActive ? 'var(--text-primary)' : 'var(--border-dim)'}`,
                cursor: 'pointer',
                borderRadius: 'var(--radius)',
                transition: 'all 0.12s ease',
              }}
            >
              {formatLot(preset)}
            </button>
          );
        })}
      </div>

      {/* Required Margin & Status banner */}
      <div
        className="row between"
        style={{
          padding: '6px 10px',
          background: isInsufficient ? 'rgba(255, 61, 113, 0.08)' : 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${isInsufficient ? 'var(--color-bear)' : 'var(--border-dim)'}`,
          marginTop: 2,
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 10,
            fontWeight: 600,
            color: isInsufficient ? 'var(--color-bear)' : 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {isInsufficient && <AlertCircle size={11} />}
          REQUIRED MARGIN
        </span>
        <span
          className="mono font-bold"
          style={{
            fontSize: 12,
            color: isInsufficient ? 'var(--color-bear)' : 'var(--text-primary)',
          }}
        >
          {formatCurrency(requiredMargin, userCurrency as any)}
        </span>
      </div>
    </div>
  );
}
