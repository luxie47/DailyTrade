# Changelog

All notable changes to DailyTrade documented in this file.

## [1.2.4] - 2026-10-12

### Added
- **Indian Benchmark Indices Integration**: Integrated real-time tracking and paper trading for **Nifty 50 (`^NSEI`)**, **BSE Sensex (`^BSESN`)**, and **Nifty Bank (`^NSEBANK`)** benchmark indices with live candlestick charts, 24h metrics, and point quotes.
- **Major Indian Bluechips & Retail Equities Expansion**: Expanded Indian asset coverage with 16 high-volume equities across key sectors:
  - **Automotive**: Mahindra & Mahindra (`M&M`), Bajaj Auto (`BAJAJ-AUTO`), Eicher Motors / Royal Enfield (`EICHERMOT`).
  - **Power & Green Energy**: Tata Power (`TATAPOWER`), Suzlon Energy (`SUZLON`).
  - **Metals, Mining & Infra**: JSW Steel (`JSWSTEEL`), Hindalco Industries (`HINDALCO`), Vedanta (`VEDL`), DLF Real Estate (`DLF`).
  - **Railways & PSU**: IRCTC Indian Railways (`IRCTC`), Indian Railway Finance Corp (`IRFC`).
  - **Fintech & Exchanges**: BSE Limited (`BSE`), CDSL Depository (`CDSL`).
  - **Consumer & Retail Giants**: Avenue Supermarts / DMart (`DMART`), Varun Beverages (`VBL`), Pidilite Industries / Fevicol (`PIDILITIND`).

### Changed
- **URL Encoding Hardening for Special Tickers**: Applied URI component encoding to Yahoo Finance query endpoints, ensuring symbols containing special characters (e.g. index carets `^`) resolve reliably across Android and browser runtimes.
- **Unified Indian Asset Multiplier & Format**: Extended native `₹` point currency formatting and 1/84 USD portfolio equity translation to benchmark indices.

---

## [1.2.3] - 2026-10-12

### Added
- **Global Tech Asset Expansion**: Integrated ASUS (`ASUUY` — ASUSTeK Computer Inc.) with live multi-tier quotes into the global equity catalog.

### Fixed
- **Market Order Execution & Sell Support**: Added full BUY / SELL side toggling to the primary Market Order modal with automatic position sizing, open-lot validation, and graceful button disabling when no open position is held.
- **1-Tap Quick Trade Sell Execution**: Corrected copy-paste dispatch in `AssetTradePanel` to invoke `marketSell` instead of `marketBuy`.
- **Mobile Viewport & Bottom Panel Visibility**: Resolved layout overflow where the segmented trade panel (Order Book / 24H Stats / 1-Tap Trade) was pushed off screen on compact mobile displays; pinned chart canvas with `flexShrink: 0` and enabled fluid flex constraints.
- **Candlestick Chart Sizing & Jitter Elimination**: Fixed issue where low-bar timeframes stretched candlesticks into oversized blocks; established standard `barSpacing: 7`, edge margins, and fluid real-time scroll alignment without border flicker.
- **Multi-Currency PnL & Order Accuracy**: Normalized Indian NSE (`.NS`) quotes against base USD cash, eliminating an 84x profit/cost exaggeration on non-USD holdings; added real-time price synchronization indicators to active position cards.
- **Environment & Credential Hardening**: Strengthened repository `.gitignore` rules against environment files (`.env*`) and cryptographic keystores (`*.keystore`, `*.jks`).

---

## [1.2.2] - 2026-10-10

### Fixed
- **Mobile Header Balance Display**: Prevented horizontal layout crowding and overflow on compact mobile devices (360px width). Standardized responsive padding, constrained account switch button width with ellipsis, and centered balance metrics with adaptive typography.

---

## [1.2.1] - 2026-10-10

### Added
- **Tiny Ticker Home Screen Widget (2x1)**: Ultra-compact Android widget (`TickerWidget.java`, `widget_ticker.xml`) displaying real-time live ticker symbol, current market price, and 24h percentage delta pill.
- **Redesigned OLED Portfolio HUD Widget (2x2)**: Modern dark card (`widget_portfolio.xml`) featuring rounded corners (`16dp`), hairline border, total equity, dynamic green/red P&L pill, and active position count.
- **Position Protection Editor (`SL/TP`)**: Direct Stop Loss and Target Price management modal on active holdings inside Portfolio tab. Set, adjust, or remove protective stops with 1 tap.
- **Periodic Market Pulse**: 12-hour automated portfolio & market update notifications to keep traders informed of active price movements.
- **Native Push & System Notifications**: Full Android 13+ `POST_NOTIFICATIONS` and `VIBRATE` permission integration; native alerts dispatch on Stop Loss triggers, Target Price fills, and limit orders.

### Fixed
- **Stop Loss Execution Inversion**: Resolved critical bug where Stop Loss was treated as an ordinary limit sell (`price >= stopLoss`) causing immediate liquidation on buy. Stop loss orders now evaluate strictly on price declines (`price <= stopLoss`) and take profits on gains (`price >= takeProfit`).
- **Global Order Matching Loop**: Fixed ticker isolation bug where pending limit orders and stop losses were only checked for the single active screen asset. The trading engine now evaluates all pending orders against all batch price ticks across the portfolio.
- **Clean OCO Pair Cancellation**: Executing a stop loss or take profit now cancels only its linked sibling order for that position, preserving independent pending limit orders.

---

## [1.2.0] - 2026-10-09

### Added
- **Android Home Screen Widget**: Native AppWidget (`PortfolioWidget.java`) display real-time total equity and P&L directly on Android home screen. One-tap widget click opens app via PendingIntent.
- **Full-Width Daily P&L Calendar**: GitHub-style 20-week (140 days) heatmap spanning full screen width. Color-coded profit (green) and loss (red) tiles, win rate metrics, and interactive single-day inspector card.
- **Segmented Trading Panel (`AssetTradePanel`)**: Replaced empty space below candlestick chart with three dedicated tabs:
  - **Order Book**: Real-time asks (red) and bids (green) with dynamic volume depth fill bars and live spread tracker.
  - **24H Stats**: High, Low, 24h Change, Volume, and gradient Price Range bar.
  - **1-Tap Quick Trade**: Fast execution pad with 10%, 25%, 50%, MAX balance presets and active position close button.
- **Target Price Alerts**: Local notifications powered by `@capacitor/local-notifications` with browser `window.Notification` fallback. Set Above/Below thresholds via 🔔 bell icon in Watchlist.
- **Stock Navigation from Portfolio**: Direct tap on any open position, pending limit order, or closed trade history item opens that asset in Trade tab.
- **Custom Deposit Input**: Custom numeric fund top-up in Account Modal supporting arbitrary amounts with Enter key submission.
- **In-App What's New View**: Direct changelog viewer inside app Account Modal.

### Changed
- **Instant Price Startup**: Persistent price cache in `localStorage` (`dt_prices_cache`) eliminates $0.00 startup lag. Non-crypto portfolio assets fetch immediately on boot.
- **Portfolio Scrolling**: Removed nested overflow container lock in `PositionsList`. Entire Portfolio tab now scrolls continuously.
- **Hardened News Feed**: Yahoo Finance query route with automated fallback financial headlines in `AssetDetail`. Prevents infinite loading state.

### Fixed
- Fixed race condition in alert checker where rapid WebSocket ticks fired duplicate notifications.
- Fixed day-of-week label alignment in P&L calendar to strictly map Sunday through Saturday columns.
- Fixed missing `</provider>` tag in `AndroidManifest.xml`.
- Fixed UTF-8 encoding in `PnLCalendar.tsx`.

---

## [1.0.0] - 2026-10-02

### Added
- Initial release: paper trading simulator with 180+ live assets (Crypto, Stocks, Commodities, Forex, Funds, Fixed Income).
- Binance WebSocket live feeds & Yahoo Finance quote integration.
- TradingView Lightweight Charts (Candlestick OHLC & Line).
- Zero-loss persistent storage, multi-account switcher, JSON backup & export.
