# 📖 DailyTrade Developer & Architecture Guide

Welcome to the **DailyTrade** developer handbook. This guide explains how DailyTrade is constructed, how every subsystem operates, and how to safely extend, debug, and add new features without breaking existing functionality.

---

## 1. System Overview & Philosophy

DailyTrade is built on three core pillars:
1. **OLED Brutalist Design**: High-contrast, minimalist dark aesthetics (Inter for UI, JetBrains Mono for numbers and tickers).
2. **Deterministic Domain Core**: Trading calculations, order matching, and margin mathematics are pure TypeScript functions (`src/core/`) completely decoupled from React rendering.
3. **Multi-Platform Resilience**: Web application runs on any browser; Android build runs via Capacitor with 100% on-device sandbox persistence and live home-screen widgets.

---

## 2. Directory Structure & Layer Responsibilities

```text
src/
├── api/                    # Network transports & market data adapters
│   ├── adapters/
│   │   ├── binanceAdapter.ts     # Live 24/7 Binance WebSocket & historical klines
│   │   ├── yahooAdapter.ts       # Multi-tier resilient Yahoo Finance quote fetcher
│   │   └── syntheticAdapter.ts   # Continuous micro-tick engine (GBM algorithm)
│   └── types.ts                  # Provider contracts & subscription callbacks
│
├── config/                 # Environment variables, constants & storage keys
│   ├── constants.ts              # Timers, default values, storage key identifiers
│   └── env.ts                    # Platform detection & API endpoint URLs
│
├── core/                   # Pure business logic (Independent of React / DOM)
│   ├── portfolio/
│   │   └── calculations.ts       # PnL math, total equity, win rate & trade stats
│   └── trading/
│       └── orders.ts             # Input validation, stop loss & take profit checks
│
├── features/               # Decomposed UI modules
│   └── account/
│       ├── AboutView.tsx         # Open source mission, donate, release notes
│       ├── AccountCreateView.tsx # Multi-currency account creation form
│       └── AccountListView.tsx   # Account switcher, deposit top-up, backup actions
│
├── native/                 # Capacitor native device bridges
│   └── widgetBridge.ts           # Android Home Screen widget IPC sync bridge
│
├── shared/                 # Universal UI primitives & utilities
│   ├── components/
│   │   ├── ErrorBoundary.tsx     # Prevents white-screen app crashes
│   │   ├── Modal.tsx             # Accessible sheet/modal dialog wrapper
│   │   ├── Button.tsx            # Standardized bull/bear/ghost/primary buttons
│   │   └── Badge.tsx             # Bull/bear status badge pills
│   └── utils/
│       └── formatPrice.ts        # Currency symbols, decimals, and price formatting
│
├── state/                  # Context state managers
│   ├── TradingContext.tsx        # Accounts, holdings, orders & execution dispatch
│   ├── MarketDataContext.tsx    # Live quote stream, candle cache & price map
│   └── UIContext.tsx             # Active tabs, modals, favorites, and toast alerts
│
└── services/               # Infrastructure facades & hardware integrations
    ├── backupService.ts          # Automatic export/import to device Documents folder
    ├── marketData.ts             # Backward-compatible re-export facade
    ├── priceAlerts.ts            # Local push notifications & 12h market updates
    └── storage.ts                # LocalStorage serialization & schema migrations
```

---

## 3. How to Add New Assets

All tradable symbols are registered in `src/data/assets.ts`.

### Step 1: Add Asset to `ASSETS` Array
```typescript
// Example: Adding a new Crypto asset
{
  symbol: 'SOLUSDT',
  name: 'Solana',
  class: 'crypto',           // 'crypto' | 'stock' | 'commodity' | 'forex' | 'fund' | 'fixed-income'
  quoteSymbol: 'SOLUSDT',    // Symbol used for upstream API fetches
  iconLetters: 'SOL',        // 2-4 uppercase characters for icon circle
  iconColor: '#9945ff',      // Hex branding color
}
```

### Step 2: Configure Price Multipliers (If Non-USD)
If the asset is traded in a local currency (such as Indian Stocks in `₹`), check `src/utils/formatPrice.ts`:
- Ensure `getAssetUSDMultiplier(symbol)` applies the appropriate exchange rate (e.g., `1 / 84` for INR).
- Ensure `formatAssetPrice(price, symbol)` applies the expected prefix (`₹`, `$`, etc.) and decimal precision.

### Step 3: Add Synthetic Baseline (Fallback)
In `src/api/adapters/syntheticAdapter.ts`, add the expected baseline price to `getBaselinePrice(symbol)` so charts never render empty if third-party APIs are down.

---

## 4. How to Add or Modify Android Home Screen Widgets

DailyTrade provides native Android widgets through Capacitor.

### Current Widgets
1. **Tiny Ticker (2x1)**: `android/app/src/main/res/layout/widget_ticker.xml`
2. **OLED Portfolio HUD (2x2)**: `android/app/src/main/res/layout/widget_portfolio.xml`

### How Widgets Receive Data
The web app communicates with Android through `src/native/widgetBridge.ts`:
```typescript
import { syncAndroidWidget } from '../native/widgetBridge';

syncAndroidWidget({
  totalEquityUSD: 10540.25,
  currency: 'USD',
  startingCashUSD: 10000,
  selectedSymbol: 'BTCUSDT',
  currentPrice: 85200,
  positionCount: 2,
});
```
This calls `WidgetBridgePlugin.java`, which updates Android's `AppWidgetManager` with real-time equity, PnL badge, and ticker prices.

---

## 5. How to Add New Screens or Modals

1. **Create the Component in `src/features/<feature>/`**:
   - Keep presentational components pure and modular.
   - Use shared UI primitives (`<Modal />`, `<Button />`, `<Badge />`).
2. **Register Modal State in `src/state/UIContext.tsx`**:
   - Add visibility state and toggle handlers (e.g., `isSettingsOpen`, `setIsSettingsOpen`).
3. **Mount in `src/App.tsx`**:
   - Wrap the component in `<ErrorBoundary fallbackTitle="Feature Error">` to ensure crashes in that component cannot break the entire dashboard.

---

## 6. How the Market Data Engine Works

```
                     ┌────────────────────────────────┐
                     │ Market Data Request (Quote)    │
                     └───────────────┬────────────────┘
                                     │
                      Crypto? ───────┴─────── Stock / Commodity / Forex?
                        │                                    │
                        ▼                                    ▼
             Binance WebSocket                      Multi-Tier Fallback:
             (wss://stream.binance.com)             1. Native Capacitor HTTP
                        │                           2. Local Vite Proxy (/api/yahoo)
                        │                           3. AllOrigins CORS Fallback
                        │                           4. Organic GBM Synthetic Ticks
                        ▼                                    │
                 Live Price Stream ◄─────────────────────────┘
```

- **Binance WebSocket (`binanceAdapter.ts`)**: Streams 24/7 live prices with automatic 3-second reconnection.
- **Yahoo Finance (`yahooAdapter.ts`)**: Multi-tier architecture bypasses CORS restrictions in local development, browser deployments, and native Android APKs.
- **Organic GBM Simulation (`syntheticAdapter.ts`)**: Geometric Brownian Motion tick generator creates realistic micro-volatility (volatility $\sigma = 0.0004$) when markets are closed.

---

## 7. How to Test Everything Locally

### Running Web Server
```powershell
npm run dev
```
Open `http://localhost:5173`.

### Running Static Type & Syntax Check
```powershell
npx tsc --noEmit
```

### Running Full Production Build
```powershell
npm run build
```

---

## 8. Release Protocol (Critical Rules)

Per `.agents/skills/dailytrade-release/SKILL.md`:
1. **Zero Local Gradle Builds**: NEVER run `./gradlew assembleDebug` or `./gradlew assembleRelease` locally. Cloud GitHub Actions automatically builds and signs the release APK on tag push.
2. **Mandatory 5-Point Sync**:
   - Increment `"version"` in `package.json`
   - Increment `versionCode` and update `versionName` in `android/app/build.gradle`
   - Add release notes in `CHANGELOG.md` under `## [X.X.X] - YYYY-MM-DD`
   - Update APK badge link in `README.md`
   - Run `npm run build && npx cap sync android`
3. **Commit & Tag**:
   ```powershell
   git add -A
   git commit -m "feat(vX.X.X): <description>"
   git tag vX.X.X
   git push origin main
   git push origin vX.X.X
   ```
