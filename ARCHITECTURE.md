# DailyTrade System Architecture & Engineering Guide

DailyTrade is an offline-capable, high-performance paper trading application built with **React 19**, **TypeScript**, **Vite**, and **Capacitor 8** for Android.

---

## 1. Directory Structure

```text
src/
├── api/                   # Resilient network data layer
│   ├── adapters/
│   │   ├── binanceAdapter.ts    # Live Binance WebSocket & kline feeds
│   │   ├── yahooAdapter.ts      # Multi-tier Yahoo Finance fallback fetcher
│   │   └── syntheticAdapter.ts  # Geometric Brownian Motion (GBM) tick engine
│   └── types.ts                 # Provider contracts & callbacks
│
├── config/                # Centralized configurations & constants
│   ├── constants.ts             # Storage keys, interval timings, app metadata
│   └── env.ts                   # Environment variables & platform detectors
├── components/            # High-level feature components
│   ├── LotSelector.tsx          # Exness-style lot size chips & margin preview
│   ├── TradingViewChart.tsx     # Lightweight Charts engine & live price tracker
│   ├── TradeModal.tsx           # Full order entry modal with SL/TP & lot controls
│   ├── AssetTradePanel.tsx      # Order book, 24h stats, and 1-tap trade panel
│   ├── PositionsList.tsx        # 4-metric account HUD, open holdings & history
│   └── UpdateModal.tsx          # Full-screen system update modal with in-button progress
│
├── hooks/                 # Custom reactive hooks
│   └── useAppUpdate.ts          # Remote GitHub release inspector & APK installer
│
├── core/                  # Pure domain logic (independent of React/DOM)
│   ├── portfolio/
│   │   └── calculations.ts      # Live metrics (Balance, Equity, Margin Level), PnL
│   └── trading/
│       ├── lots.ts              # Institutional contract specifications & leverage
│       └── orders.ts            # Order validation, SL/TP triggers, execution logic
│
├── features/              # Feature modules & decomposed screens
│   └── account/
│       ├── AboutView.tsx        # Project open source mission, links, disclaimer
│       ├── AccountCreateView.tsx# Account creation form
│       └── AccountListView.tsx  # Multi-account manager & controls
│
├── native/                # Capacitor native integrations
│   └── widgetBridge.ts          # Android Home Screen Widget sync bridge
│
├── shared/                # Universal UI components & utilities
│   ├── components/
│   │   ├── ErrorBoundary.tsx    # Crash resilience container
│   │   ├── Modal.tsx            # Accessible modal dialog
│   │   ├── Button.tsx           # Styled trading button primitive
│   │   └── Badge.tsx            # Bull/bear status badge primitive
│   └── utils/
│       └── formatPrice.ts       # Multi-currency price formatting
│
├── state/                 # Application state managers
│   ├── TradingContext.tsx       # Trading engine context provider
│   ├── MarketDataContext.tsx   # Live prices, ticker cache & subscriptions
│   └── UIContext.tsx            # Navigation tabs, modals & toasts
│
├── utils/                 # General utility modules
│   ├── formatMarkdown.ts        # Zero-dependency inline markdown parser
│   └── uuid.ts                  # Cryptographically random ID generator
│
└── services/              # Infrastructure facades (storage, alerts, backups)
    ├── backupService.ts         # Android Documents auto-backup & restore
    ├── marketData.ts            # Facade re-exporting API adapters
    ├── priceAlerts.ts           # System notifications & price triggers
    └── storage.ts               # LocalStorage serialization & migrations
```

---

## 2. Core Domain Layer (`src/core/`)

All critical trading rules and mathematical calculations live in pure, framework-agnostic TypeScript functions:

### A. Exness Lot Sizing Engine (`src/core/trading/lots.ts`)
- **Standard Contract Sizes**:
  - **Forex**: 100,000 units/lot with **1:100** leverage.
  - **Crypto**: 1.0 unit/lot with **1:10** leverage.
  - **Commodities**: 100 units/lot (e.g. 100 oz Gold, 100 bbl Crude Oil) with **1:50** leverage.
  - **Stocks**: 1.0 unit/lot with **1:5** leverage.
- **Dynamic Required Margin**: `Required Margin = (LotSize × ContractSize × Price) / Leverage`.
- **Bidirectional Unit Scaling**: Seamless conversion between broker standard lots and asset base units (`lotToUnits` / `unitsToLot`).

### B. Live Account Valuation & Margin Engine (`src/core/portfolio/calculations.ts`)
- **Balance**: Cash balance plus total principal invested in open positions.
- **Equity**: Real-time account liquidation value (`Cash + Total Open Position Market Value`).
- **Used Margin**: Sum of required margins across all active holdings.
- **Free Margin**: `Equity − Used Margin` (safeguards against margin liquidations).
- **Margin Level %**: `(Equity / Used Margin) × 100` with visual color bands (Green > 200%, Amber 100–200%, Red < 100%).
- **Trade Commissions**: Standard broker commission model of `$2.00 / lot` (minimum `$0.02`).

### C. Execution & Order Rules (`src/core/trading/orders.ts`)
- **Direction-Aware Validation**: Input, inventory, and cash margin guards across both Long and Short orders.
- **Trigger Logic (`shouldOrderFill`)**: Evaluates limit orders, stop losses (protective buy-to-cover on shorts), and take profit targets with automated One-Cancels-Other (OCO) sibling cancellation.

---

## 3. Interactive Chart Architecture & UI Affordances

### A. Live Candle Bucket Alignment & Grid Snapping
- Incoming streaming ticks anchor strictly to the active timeframe bar bucket (`curTime + stepSec`).
- High, Low, and Close update in-place without altering timescale width or triggering chart re-renders.
- Fallback candle generator timestamps are mathematically snapped to `Math.floor(now / stepSec) * stepSec` grid, eliminating distorted bars or out-of-order time collisions.

### B. Two-Axis Interactive Scaling
- **Vertical Price Scale (Height Zoom)**: Dragging along the right-hand price scale expands or compresses vertical price intervals.
- **Horizontal Time Scale (Width Zoom)**: Dragging or pinching along the bottom time axis widens or tightens candlestick spacing (`barSpacing: 7` default).
- **Auto-Reset**: Double-clicking the chart canvas resets both price and time axes to optimal fit.

### C. Tactile Action Affordances
- Position protection features elevated, stateful `<Shield />` action buttons with amber active glows, green protected states, and tactile micro-steppers for instantaneous Stop Loss and Take Profit adjustments.

### D. Interactive On-Chart SL/TP Drag Controls
- Users can directly grab and vertically slide red dashed Stop Loss (`SL`) and green dashed Take Profit (`TP`) lines directly on the candlestick chart canvas.
- Pointer move events smoothly map canvas Y-coordinates to price via Lightweight Charts' `series.coordinateToPrice()` and snap to asset precision.
- Drag release immediately commits updated protective stop thresholds through `onUpdateSLTP` directly to the active position without modal interruption.

---

## 4. Resilient Market Data Pipeline (`src/api/`)

```
                  ┌───────────────────────────────┐
                  │ Market Data Request (Quote)   │
                  └──────────────┬────────────────┘
                                 │
                   Crypto? ──────┴────── Stock / Forex / Commodity?
                     │                                   │
                     ▼                                   ▼
          Binance WebSocket                     Multi-tier Waterfall:
          (wss://stream.binance.com)            1. Native Capacitor HTTP
                     │                          2. Vite Local Dev Proxy
                     │                          3. AllOrigins CORS Fallback
                     │                          4. Deterministic GBM Ticks
                     ▼                                   │
              Live Price Stream ◄────────────────────────┘
```

1. **Crypto Assets**: Live 24/7 streaming via Binance combined WebSocket streams (`@ticker`).
   - **Persistent Regional Circuit-Breaker**: In regions where Binance is ISP-throttled or DNS-blocked, connections automatically trip into a 1-hour quiet period backed by `localStorage` and `sessionStorage`. This prevents repeated failed connection attempts and seamlessly shifts to real Yahoo quotes and calm synthetic micro-ticks with zero user-perceptible delay.
2. **Stocks / Forex / Commodities**: Fetched through Yahoo Finance v8 chart APIs with multi-tier CORS resilience.
3. **Synthetic Tick Engine**: When markets are closed or offline, an organic Geometric Brownian Motion (GBM) tick engine maintains continuous live micro-fluctuations.

---

## 5. Native Android Integration (`src/native/`)

- **Widget Bridge**: `syncAndroidWidget` updates Android AppWidget providers (`TinyTicker` and `PortfolioHUD`) via Capacitor's `WidgetBridgePlugin`.
- **Zero Local Gradle Rule**: Local builds run strictly via `npm run build` (`tsc && vite build`). Android APK compilation is handled exclusively in the cloud via GitHub Actions.
- **Local Sandbox**: 100% on-device state persistence with automated backups exported to `Documents/DailyTrade`.

---

## 6. In-App System Update & Zero-Dependency Markdown Engine

### A. Fullscreen System Update Modal (`src/components/UpdateModal.tsx`)
- **Immersive Presentation**: Full-screen modal with camera notch safe area padding (`env(safe-area-inset-top)`).
- **In-Button Progress Bar**: Features an integrated download percentage bar tracking progress directly inside the action button.
- **One-Tap Package Preparation**: Smoothly transitions from `UPDATE` (percentage tracking) into an active `INSTALL NOW` action that directly opens the verified APK via Android Package Installer (`window.open(url, '_system')`).
- **Dynamic Release Notes**: Extracts and parses the top release highlights from GitHub Releases API for the incoming build while discarding obsolete versions and markdown headers.

### B. Zero-Dependency Markdown Formatting (`src/utils/formatMarkdown.ts`)
- **Lightweight Parser**: Safe, zero-npm-dependency regex formatter converting `**bold**`, `*italic*`, and `` `code` `` tags into styled HTML.
- **Security**: Escapes HTML entities (`&`, `<`, `>`, `"`, `'`) before applying token replacements to prevent script injection.

