// SVG mini sparkline — renders last N price points as a colored polyline
interface Props {
  prices: number[];       // array of close prices
  isUp: boolean;
  width?: number;
  height?: number;
}

export function Sparkline({ prices, isUp, width = 64, height = 28 }: Props) {
  if (prices.length < 2) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 2;

  const pts = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (p - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const color = isUp ? '#00e676' : '#ff3d71';
  const fillId = `sf-${isUp ? 'u' : 'd'}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} overflow="visible">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <polygon
        points={`${prices.map((p, i) => {
          const x = pad + (i / (prices.length - 1)) * (width - pad * 2);
          const y = pad + (1 - (p - min) / range) * (height - pad * 2);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ')} ${(width - pad).toFixed(1)},${(height - pad).toFixed(1)} ${pad},${(height - pad).toFixed(1)}`}
        fill={`url(#${fillId})`}
      />
      {/* Line */}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Generate a synthetic sparkline from price + changePct (used when no history available)
export function syntheticSparkline(price: number, changePct: number, n = 20): number[] {
  const start = price / (1 + changePct / 100);
  const trend = (price - start) / n;
  const volatility = Math.abs(price) * 0.004;
  // Use symbol hash as seed for deterministic noise
  let seed = Math.abs(price * 1000) % 9999;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280 - 0.5;
  };
  const arr: number[] = [start];
  for (let i = 1; i < n; i++) {
    arr.push(arr[i - 1] + trend + rand() * volatility);
  }
  arr[arr.length - 1] = price; // pin last to real price
  return arr;
}
