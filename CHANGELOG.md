# Changelog

All notable changes to DailyTrade documented in this file.

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
