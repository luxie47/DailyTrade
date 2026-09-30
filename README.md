# 📈 DailyTrade — Free Paper Trading Simulator

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119eff.svg?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Android APK](https://img.shields.io/badge/APK-v1.0.0-3DDC84.svg?logo=android&logoColor=white)](DailyTrade.apk)
[![TradingView Charts](https://img.shields.io/badge/Powered%20By-Lightweight%20Charts-00e676.svg)](https://tradingview.github.io/lightweight-charts/)
[![Orion Store Ready](https://img.shields.io/badge/Orion%20Store-Ready-purple.svg)](orion-metadata.json)
[![Build APK](https://github.com/dailytrade/dailytrade/actions/workflows/build-apk.yml/badge.svg)](.github/workflows/build-apk.yml)

**A high-performance, minimalist paper trading simulator with real live market feeds and zero real money involved.**  
*Practice trading stocks, crypto, crude oil, forex, index mutual funds, and fixed deposits with zero risk.*

[Download APK](DailyTrade.apk) • [Featured Project: DailyFlow](https://dailyflow-luxie.vercel.app) • [Features](#-features) • [Data Flow](#-architecture--data-flow) • [Quick Start](#-quick-start) • [Roadmap](#-secure-roadmap) • [Disclaimer](#-legal--financial-disclaimer)

</div>

---

> ### ⚠️ LEGAL & FINANCIAL DISCLAIMER
> **DailyTrade is an educational paper trading simulation application.**  
> * All account balances, profits, losses, and order executions are **100% virtual simulation credits** with zero real-world cash value.
> * No real funds or fiat currency can be deposited, traded, or withdrawn.
> * DailyTrade and its contributors **do not provide financial, investment, legal, or tax advice**.
> * Past performance on this simulator does not indicate or guarantee real-world market success. Always consult a certified financial advisor before trading real capital.

---

## 🌟 Featured Project & Developer Support

<div align="center">

### 🚀 Check Out My Flagship App: [DailyFlow](https://dailyflow-luxie.vercel.app)

**DailyFlow** is a modern hybrid tracker and workflow powerhouse designed to organize daily tasks, optimize productivity, and track habits in real-time.

[![Visit DailyFlow](https://img.shields.io/badge/Visit-DailyFlow%20App-4f46e5?style=for-the-badge&logo=vercel&logoColor=white)](https://dailyflow-luxie.vercel.app)

</div>

### ☕ Support Ongoing Development / Donate
If you find DailyTrade helpful or want to support ongoing open-source development for **DailyTrade** and **DailyFlow**, donations are deeply appreciated! To donate or get in touch:
* **Discord**: `Luxie47`
* **In-Game / Alias**: `mial` / `luxiee47`
* **Email**: [`luxie47@gmail.com`](mailto:luxie47@gmail.com)

---

## ✨ Features

* **100% Free & Open Source**: No sign-ups, no subscriptions, zero paywalls, zero telemetry.
* **Real Live Market Feeds**: Sub-second live WebSocket streaming from Binance for Crypto and direct live quotes from Yahoo Finance for global equities and commodities.
* **TradingView Aesthetic**: Pure OLED dark brutalist theme (`#000000`), custom dotted dynamic price lines, crisp sparklines, and typography (`Inter` for UI, `JetBrains Mono` for tabular prices).
* **Multi-Asset Ecosystem**: 120+ assets spanning 6 distinct asset classes (US & Indian Equities, Energy Commodities, Forex Pairs, Index ETFs, and Treasury/FD Yields).
* **Realistic Order Simulation**: Market orders, Limit orders, Stop Loss & Take Profit (with true One-Cancels-the-Other / OCO cleanup).
* **Multi-Currency Accounts**: Switch seamlessly between `$ USD`, `€ EUR`, `₹ INR`, `£ GBP`, and `¥ JPY` with auto-converted portfolio analytics.
* **Automated Fast APK Generation**: GitHub Actions workflow compiles and packages `DailyTrade.apk` in under 3 minutes on every release.
* **Orion Store Ready**: Includes full `orion-metadata.json`, Fastlane metadata, and PWA manifest for instant installation.

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

## 🏗️ Architecture & Data Flow

DailyTrade is architected to operate with **zero backend dependencies**, **zero API costs**, and **100% on-device privacy**:

```
 ┌────────────────────────────────────────────────────────┐
 │                    DailyTrade Client                   │
 │                                                        │
 │  ┌─────────────────┐ ┌───────────────┐ ┌────────────┐  │
 │  │ TradingView     │ │ LocalStorage  │ │ Execution  │  │
 │  │ Lightweight V5  │ │ Engine & OCO  │ │ Engine     │  │
 │  └────────▲────────┘ └───────▲───────┘ └──────▲─────┘  │
 └───────────┼──────────────────┼────────────────┼────────┘
             │                  │                │
      Live Price Ticks          │        Order Execution
             │                  │
 ┌───────────┴──────────────────┴─────────────────────────┐
 │               Zero-CORS Market Ingestion               │
 ├────────────────────────────┬───────────────────────────┤
 │     Crypto Assets          │   Global Equities / Forex │
 │     (Sub-Second Live)      │   (Candles & Quotes)      │
 │  ┌──────────────────────┐  │  ┌──────────────────────┐ │
 │  │  Binance WebSocket   │  │  │    Yahoo Finance     │ │
 │  │  wss://stream        │  │  │  Native direct / CORS│ │
 │  └──────────────────────┘  │  └──────────────────────┘ │
 └────────────────────────────┴───────────────────────────┘
```

1. **Crypto Feed**: Connects via native WebSocket to Binance (`wss://stream.binance.com:9443`). Ticks arrive in real-time (< 200ms) with zero rate limits.
2. **Global Stocks & Commodities**:
   - In the **Android APK**: Capacitor's native HTTP layer bypasses CORS restrictions and pulls quotes straight from `query1.finance.yahoo.com`.
   - In the **Web Browser**: Transparent fallback proxies ensure uninterrupted candle streaming.
3. **Execution Engine**:
   - Evaluates open positions and pending limit orders on every single tick.
   - Triggers Stop Loss and Take Profit levels automatically.
   - Cleans up orphaned orders using One-Cancels-the-Other (OCO) logic.

---

## ⚡ Fast Automated APK Generation

DailyTrade includes a turnkey GitHub Actions CI/CD pipeline in [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml):

* **Push or Tag**: Pushing a tag (e.g. `v1.0.0`) automatically compiles the Android app and publishes `DailyTrade.apk` directly to GitHub Releases.
* **Fast Local Build (~35s)**:
  ```bash
  # Sync web assets to Capacitor
  npm run apk:sync

  # Compile APK with Gradle
  npm run apk:build
  ```
  The APK is placed directly in the project root as `DailyTrade.apk`.

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+
- npm or pnpm
- Android Studio / OpenJDK 17 (only if compiling native Android APK locally)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/DailyTrade.git
cd DailyTrade
npm install
```

### 2. Start Local Dev Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build Web Production Bundle
```bash
npm run build
```

---

## 🌌 Orion Store & Open-Source Catalog Readiness

DailyTrade is configured out of the box for immediate inclusion in privacy-centric app repositories:
* **Orion Store Metadata**: Defined in [`orion-metadata.json`](orion-metadata.json).
* **Fastlane Directory**: Standard listing structure located at [`fastlane/metadata/android/en-US/`](fastlane/metadata/android/en-US/).
* **PWA Web App Manifest**: [`public/manifest.json`](public/manifest.json) configured with standalone display mode, dark UI status bar, and maskable icons.
* **Zero Anti-Features**: Zero proprietary trackers, zero Google Mobile Services (GMS) dependencies.

---

## 🔒 Privacy & Offline First

* **Zero Tracking**: No Google Analytics, no Firebase, no tracking cookies, no telemetry.
* **100% Local Storage**: Portfolios, trade history, open positions, and favorite watchlists are saved strictly on your local device.
* **Backup & Restore**: Easily export and import your portfolio data via JSON from the Accounts menu.
* Review our full [Privacy Policy](PRIVACY.md).

---

## 🔧 Customization Guide

### Adding New Tickers
To add any new stock, cryptocurrency, or commodity, simply add an entry to `src/data/assets.ts`:
```typescript
{
  symbol: 'NVDA',            // Display symbol
  name: 'NVIDIA Corporation',
  class: 'stock',            // 'stock' | 'crypto' | 'commodity' | 'forex' | 'fund' | 'fd'
  quoteSymbol: 'NVDA',       // Yahoo Finance / Binance quote symbol
  precision: 2,
}
```

### Adjusting Starting Balances & Accounts
Head into `src/types/account.ts` to customize starting cash presets, or use the in-app **Accounts** menu to create custom simulation accounts.

---

## 🛡️ Secure Roadmap

- [x] High-speed Binance live crypto WebSockets
- [x] Multi-asset support (120+ symbols)
- [x] One-Cancels-the-Other (OCO) order execution
- [x] Cross-platform Android APK compilation
- [x] Multi-currency accounting (USD, EUR, INR, GBP, JPY)
- [ ] **Technical Indicators Overlay** (RSI, MACD, EMA 20/50/200 on chart)
- [ ] **Custom Price Alerts** (Local background notifications when target price hits)
- [ ] **Tax & Trading Journal Export** (Download full CSV trade history)
- [ ] **Multiple Watchlist Tabs** (Custom user-defined watchlist groups)

---

## ❓ Troubleshooting & FAQ

<details>
<summary><strong>Why are stock and commodity charts flat on weekends?</strong></summary>
Traditional equity and commodity markets (NYSE, NASDAQ, NSE India, NYMEX) close on weekends and public holidays. During market closure, Yahoo Finance serves the last recorded closing price. Crypto markets (BTC, ETH, etc.) remain live 24/7.
</details>

<details>
<summary><strong>Why does the Android APK fetch prices faster than the browser?</strong></summary>
In a desktop browser, third-party requests are subject to browser Cross-Origin Resource Sharing (CORS) security policies. In the native Android APK, requests are handled directly by Capacitor's native network stack, connecting straight to `query1.finance.yahoo.com` with zero CORS latency.
</details>

<details>
<summary><strong>How do I reset my balance if I blow up my paper account?</strong></summary>
Open the top-left Account menu (`Wallet` icon), click **RESET**, and your account will be instantly restored to its starting balance. You can also create multiple test accounts with different currencies.
</details>

<details>
<summary><strong>How do I install the APK on my Android device?</strong></summary>
Download `DailyTrade.apk` onto your Android phone. When opening the file, tap "Settings" if prompted and enable "Allow installation from this source". Tap "Install" to complete.
</details>

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
