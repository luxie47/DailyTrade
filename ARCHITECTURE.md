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
│
├── core/                  # Pure domain logic (independent of React/DOM)
│   ├── portfolio/
│   │   └── calculations.ts      # PnL math, equity valuation, win-rate metrics
│   └── trading/
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
└── services/              # Infrastructure facades (storage, alerts, backups)
    ├── backupService.ts         # Android Documents auto-backup & restore
    ├── marketData.ts            # Facade re-exporting API adapters
    ├── priceAlerts.ts           # System notifications & price triggers
    └── storage.ts               # LocalStorage serialization & migrations
```

---

## 2. Core Domain Layer (`src/core/`)

All critical trading rules and mathematical calculations live in pure, framework-agnostic TypeScript functions:
- **`calculateUnrealizedPnL(positions, prices)`**: Computes open position profit/loss for both long (`current - entry`) and short (`entry - current`) positions respecting currency multipliers (e.g. INR to USD).
- **`calculatePositionValue(position, currentPrice)`**: Calculates liquid position market value, isolating margin-locked equity for open shorts (`Math.max(0, margin + pnl)`).
- **`calculateTotalEquity(cashUSD, positions, prices)`**: Combines cash balance and open market valuations across mixed long/short books.
- **`validateMarketBuy(...)` / `validateMarketSell(...)` / `validateMarketShort(...)`**: Pure input, inventory, and cash margin guards.
- **`shouldOrderFill(order, price)`**: Direction-aware trigger validation for limit orders, stop losses (protective Buy-to-Cover on shorts), and take profit targets with OCO cancellation logic.

---

## 3. Resilient Market Data Pipeline (`src/api/`)

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
2. **Stocks / Forex / Commodities**: Fetched through Yahoo Finance v8 chart APIs with multi-tier CORS resilience.
3. **Synthetic Tick Engine**: When markets are closed or offline, an organic Geometric Brownian Motion (GBM) tick engine maintains continuous live micro-fluctuations.

---

## 4. Native Android Integration (`src/native/`)

- **Widget Bridge**: `syncAndroidWidget` updates Android AppWidget providers (`TinyTicker` and `PortfolioHUD`) via Capacitor's `WidgetBridgePlugin`.
- **Zero Local Gradle Rule**: Local builds run strictly via `npm run build` (`tsc && vite build`). Android APK compilation is handled exclusively in the cloud via GitHub Actions.
- **Local Sandbox**: 100% on-device state persistence with automated backups exported to `Documents/DailyTrade`.
