# 📈 DailyTrade — Free Paper Trading App

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119eff.svg?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Android APK](https://img.shields.io/badge/APK-v1.0.0-3DDC84.svg?logo=android&logoColor=white)](DailyTrade.apk)
[![TradingView Charts](https://img.shields.io/badge/Powered%20By-Lightweight%20Charts-00e676.svg)](https://tradingview.github.io/lightweight-charts/)
[![Orion Store Ready](https://img.shields.io/badge/Orion%20Store-Ready-purple.svg)](orion-metadata.json)

**A high-performance, minimalist paper trading simulator with real live market feeds and zero real money involved.**  
*Practice trading stocks, crypto, crude oil, forex, index mutual funds, and fixed deposits with zero risk.*

[Download APK](DailyTrade.apk) • [Features](#-features) • [Quick Start](#-quick-start) • [Asset Coverage](#-asset-coverage) • [Architecture](#-architecture) • [Orion Store](#-orion-store--pwa-readiness)

</div>

---

## ✨ Highlights

* **100% Free & Open Source**: No sign-ups, no subscriptions, no credit cards, zero telemetry.
* **Real Live Market Prices**: Sub-second live WebSocket streaming from Binance for Crypto and direct live quotes from Yahoo Finance for global markets.
* **Minimalist TradingView Aesthetic**: Pure OLED dark brutalist theme (`#000000`), custom dotted dynamic price lines, crisp sparklines, and professional financial typography (`Inter` for UI, `JetBrains Mono` for tabular prices).
* **Multi-Asset Ecosystem**: 120+ assets spanning 6 distinct asset classes (US & Indian Equities, Energy Commodities, Forex Pairs, Index ETFs, and Treasury/FD Yields).
* **Realistic Order Simulation**: Market orders, Limit orders, Stop Loss & Take Profit (with true One-Cancels-the-Other / OCO cleanup).
* **Cross-Platform**: Runs in modern web browsers as a high-speed Progressive Web App (PWA) and compiles directly to a native **Android APK** via Capacitor.

---

## 📱 Asset Coverage (120+ Live Symbols)

| Category | Assets Included | Data Feed | Precision / Currency |
| :--- | :--- | :--- | :--- |
| **Crypto** | BTC, ETH, SOL, BNB, XRP, DOGE, AVAX, LINK, SUI, ADA, PEPE, SHIB | Binance WebSocket (24/7 Live Ticks) | `$` (USD) |
| **Commodities & Oil** | WTI Crude Oil (`CL=F`), Brent Crude (`BZ=F`), Natural Gas, Gasoline, Heating Oil, Gold (`GC=F`), Silver, Copper, Platinum | NYMEX / COMEX via Yahoo Chart API | `$` (USD) |
| **Forex & US Dollar** | US Dollar Index (DXY), EUR/USD, GBP/USD, USD/INR, USD/JPY, AUD/USD, USD/CAD, USD/CHF | Interbank FX Feed via Yahoo | Ratio (4 decimals) / `₹` |
| **Index Funds & ETFs** | Vanguard S&P 500 (`VOO`, `SPY`), Invesco QQQ, Russell 2000, SCHD Dividend, SMH Semiconductors, Nifty 50 BeES | Global Exchanges via Yahoo | `$` / `₹` |
| **Fixed Income & FD** | 10-Year Treasury Yield (`^TNX`), 30-Year Yield, US 1-3M T-Bills (`BIL`), 20Y Treasury (`TLT`), Liquid BeES (FD Benchmark) | US Treasury / NSE Benchmark | `%` Yield / `₹` |
| **US & Indian Stocks** | Apple, Nvidia, Tesla, Microsoft, Alphabet, Amazon, Reliance, TCS, HDFC Bank, Infosys, Tata Motors, ICICI Bank | NASDAQ, NYSE, NSE India | `$` / `₹` |

---

## 🛠️ Tech Stack

* **Frontend**: React 19, TypeScript, Vite
* **Charting Engine**: TradingView `lightweight-charts` (v5)
* **Styling**: Vanilla CSS tokens (pure OLED black `#000000`, glassmorphism borders, zero Tailwind bloat)
* **Icons**: `lucide-react`
* **Mobile Runtime**: Capacitor 8 (Native Android bridge, zero-CORS native HTTP interceptors)
* **Persistence**: LocalStorage with automatic schema validation, crash guards, and JSON import/export

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/DailyTrade.git
cd DailyTrade
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 📱 Building the Native Android APK

DailyTrade includes a full Capacitor Android project configured with Java 17 and native zero-CORS network access:

```bash
# 1. Build web bundle and sync assets to Android
npm run apk:sync

# 2. Compile native Android Debug APK
npm run apk:build
```

The resulting package will be generated at:
```
DailyTrade.apk (Project root)
└── android/app/build/outputs/apk/debug/app-debug.apk (~4.3 MB)
```

To install on an Android phone, simply transfer `DailyTrade.apk` via USB, WhatsApp, or cloud storage, tap to install, and allow unknown sources.

---

## 🌌 Orion Store & PWA Readiness

DailyTrade is built to be 100% store-ready for open-source app repositories and modern privacy-focused browsers:

1. **Orion Store Catalog**:
   - Includes standard open-source catalog definition in [`orion-metadata.json`](orion-metadata.json).
   - Package Name: `com.dailytrade.app`
   - Zero proprietary SDKs, zero ads, zero trackers.

2. **Orion Browser / PWA Manifest**:
   - Complete Web App Manifest in [`public/manifest.json`](public/manifest.json).
   - Full `standalone` display mode, dark status bar, and adaptive maskable SVG icons.
   - Installable with 1-click in Orion Browser, Chrome, Brave, and Safari.

---

## 🔒 Privacy & Offline First

* **Zero Tracking**: No Google Analytics, no telemetry, no tracking pixels.
* **100% Local Storage**: Portfolios, trade history, open positions, and favorite watchlists are saved strictly on your local device.
* **Backup & Restore**: Easily export and import your portfolio data via JSON from the Accounts menu.

---

## 🤝 Contributing

Contributions from the open-source community are very welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.
