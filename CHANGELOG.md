# Changelog

All notable changes to DailyTrade documented in this file.

## [1.3.1] - 2026-10-23

### Added
- **Formal Chart Trade Level Controls (`[POSITIONS]`)**: Introduced an illuminated toolbar toggle button (`[POSITIONS]`) allowing traders to show or hide all trade-related visual artifacts—including active Entry lines, Stop Loss dashed lines, Take Profit dashed lines, and pending limit orders—across both Candlestick (OHLC) and Line (Area) chart modes with persistent on-device state.
- **Interactive Floating Order Chips & Entry Anchors**: Left-aligned high-contrast draggable badges for Stop Loss, Take Profit, and active Entry prices featuring live P&L projections, lot sizes, and single-tap order cancellation directly on the chart canvas.
- **Dynamic P&L Projections on Draggable Handles**: Real-time projection formatting on active Stop Loss (`SL -$XX.XX`) and Take Profit (`TP +$XX.XX`) chips calculated continuously from the active position basis.

### Enhanced & Optimized
- **Complete Canvas Lifecycle & Memory Cleanup**: Explicit disposal and memory recycling of Lightweight Charts canvas price lines when trade levels are toggled off, preventing memory leaks, ghost lines, and unnecessary canvas repaint cycles.
- **Cross-Chart Coordinate Synchronization**: Unified coordinate mapping ensuring all trade levels, entry lines, and draggable chips align consistently across both Candlestick and Area Line chart views.

---

## [1.3.0] - 2026-10-23

### Added
- **Interactive Chart SL/TP Drag Controls**: Directly grab, slide, and adjust Stop Loss (red) and Take Profit (green) price levels on live candlestick charts with instant visual price updates.
- **Seamless System Upgrade Experience**: Enhanced full-screen upgrade view with real-time download tracking right inside the action button, automatic package preparation, and 1-tap installation.
- **Zero-Dependency Markdown Engine**: Crisp typography parsing for release notes with clean font hierarchy, high-contrast monospace tags, and zero clutter.

### Enhanced & Optimized
- **Ultra-Smooth Chart Loading & Timeframe Transitions**: Swapping timeframes (1m to 1h) or exploring assets now retains previous chart data seamlessly in the background, eliminating blank screen flashes on mobile displays.
- **High-Availability Market Feeds**: Enhanced multi-tier routing with persistent circuit-breaking so real-time prices remain calm, accurate, and continuous worldwide without network disruptions.
- **Mobile Viewport Optimization**: Notch-safe layout and pinned live countdown timers keeping every tick and candle close countdown permanently in view across all phone screen sizes.

---

## [1.2.9] - 2026-10-15

### Added
- **Exness-Style Lot Sizing Engine**: Introduced standard institutional contract specifications (Forex 100,000 units/lot with 1:100 leverage; Crypto 1.0 unit/lot with 1:10 leverage; Commodities 100 units/lot with 1:50 leverage; Stocks 1.0 unit/lot with 1:5 leverage). Added quick lot selector chips (`0.01` to `1.00`), micro-steppers, and pre-trade required margin previews across all order entry points.
- **Real-Time Account Metrics & Margin Health**: Integrated an account header metric bar displaying live Balance, Equity, Used Margin, Free Margin, and Margin Level % with color-coded health indicators to safeguard positions against margin calls.
- **Interactive Protective Order Controls**: Re-engineered Stop Loss and Take Profit with high-contrast tactile action buttons, visual `<Shield />` protection indicators, and an inline rapid stepper strip under open holdings.
- **Enhanced Trade History Architecture**: Extended trade records to capture execution lot size, trading commission, Entry → Exit execution path, and net realized P&L without horizontal screen clipping on mobile screens.

### Fixed
- **Live Candle Formation & Price Scale Synchronization**: Anchored streaming ticks to the active timeframe bar bucket, eliminating distorted candlestick bar spacing and horizontal width stretching. Synchronized the live price line with the right-hand price scale badge in real-time.
- **Pending Order Lifecycle & OCO Automation**: Ensured lot metadata is strictly preserved when modifying Stop Loss or Take Profit orders on existing holdings. Reinforced One-Cancels-Other (OCO) automation to cancel orphan protective orders when positions close.

---

## [1.2.8] - 2026-10-13

### Added
- **Short Trading & Buy-to-Cover Engine**: Enabled direct short selling for all supported assets without requiring an existing long position. Implemented margin-locked equity accounting, inverted stop loss / take profit trigger evaluations, and clear direction-aware `SHORT` / `LONG` UI indicators across charts, open positions, and trade history.
- **Visual Stop Loss & Take Profit Chart Lines**: Real-time interactive visualization of protective orders directly on Lightweight Charts with red dashed Stop Loss and green dashed Take Profit levels.
- **High-Demand Market Catalog Expansion**: Expanded market coverage across all asset classes with over 30 new instruments:
  - **Commodities & Resources**: Spot Gold benchmark (`XAUUSD=X` / `GC=F`), Lithium & Battery ETF (`LIT`), Invesco Agriculture (`DBA`), Gold Miners (`GDX`), Uranium (`URA`), Natural Gas (`UNG`), Copper (`CPER`).
  - **Index Funds & Thematic ETFs**: UltraPro Short QQQ 3X (`SQQQ`), UltraPro QQQ 3X (`TQQQ`), Vanguard Total World (`VT`), JPMorgan Equity Premium (`JEPI`), iShares Bitcoin Trust (`IBIT`), Semiconductor 3X (`SOXL`), Biotech (`XBI`).
  - **US Equities**: Reddit (`RDDT`), Roblox (`RBLX`), Alibaba Group (`BABA`), Shopify (`SHOP`), Spotify (`SPOT`), Dell (`DELL`), AppLovin (`APP`), Cloudflare (`NET`).
  - **Indian Market Leaders**: Polycab India (`POLYCAB.NS`), Dixon Technologies (`DIXON.NS`), Rail Vikas Nigam (`RVNL.NS`), Persistent Systems (`PERSISTENT.NS`), NHPC (`NHPC.NS`), Mazagon Dock (`MAZDOCK.NS`), KPIT Tech (`KPITTECH.NS`), Kalyan Jewellers (`KALYANKJIL.NS`).

### Fixed
- **Price Axis Label Collision**: Resolved duplicate overlapping price badge rendered on Lightweight Charts by disabling secondary axis labels on real-time price tracker lines.
- **Chart Candle Timestamp Sequencing**: Implemented strict sorting and deduplication for incoming candle arrays to eliminate irregular candlestick transitions and width distortion.
- **Web Browser CORS Proxy Routing**: Hardened multi-tier network waterfall in `yahooAdapter` to prevent direct browser calls against raw Yahoo endpoints, ensuring clean console logs in development and production webviews.
- **NSE Demerger & Rebrand Symbol Mapping**: Updated `TATAMOTORS.NS` to active quote ticker `TMPV.NS` and `ZOMATO.NS` to `ETERNAL.NS` to prevent 404 response errors.

---

## [1.2.7] - 2026-10-12

### Changed
- **Architectural Stabilization & Layered Refactor**: Refactored the core application codebase into a clean, modular architecture separating UI presentation, domain mathematics, and network data layers.
- **Pure Domain Engine (`src/core/`)**: Extracted all PnL mathematics, equity calculations, order validation checks, and stop-loss/take-profit triggers into framework-agnostic, deterministic domain functions.
- **Modular Market Data Adapters (`src/api/`)**: Decoupled Binance WebSocket, Yahoo Finance multi-tier REST fetcher, and organic Geometric Brownian Motion (GBM) micro-tick engines into isolated adapters with auto-reconnection and fallback handling.
- **Native Android Widget Decoupling (`src/native/`)**: Isolated Android Home Screen Widget synchronization (`syncAndroidWidget`) into a typed native bridge module.
- **Component Decomposition**: Decomposed the monolithic 625-line AccountModal into dedicated single-responsibility sub-views (`AboutView`, `AccountCreateView`, `AccountListView`).
- **Resilience & Crash Prevention**: Integrated a top-level `ErrorBoundary` component to isolate rendering failures and prevent white-screen crashes.
- **Centralized Environment & Configurations**: Extracted hardcoded endpoints, storage keys, and interval timers into type-safe configuration modules (`src/config/constants.ts` and `src/config/env.ts`).

### Added
- **Developer Handbook**: Added `guide.md` covering system philosophy, asset onboarding, widget development, and testing protocols.
- **Architecture Specification**: Added `ARCHITECTURE.md` documenting data flows and layer responsibilities.

---

## [1.2.6] - 2026-10-12

### Fixed
- **Quick-Trade SELL Handler Decoupling**: Decoupled quick-trade sell handlers and resolved order book overflow issues during high-frequency volatility.

---

## [1.2.5] - 2026-10-12

### Fixed
- **Live Candle Rollover (Chart Sizing Bug)**: Resolved the root cause of the running candle appearing unusually large and stretched in real time. The previous implementation compared a historical market-open timestamp against the current wall-clock time, causing the rollover condition to fire on every single price tick instead of at the correct timeframe boundary. Fixed by computing the exact next TF boundary (`floor(cur.time / step + 1) * step`) and only spawning a new candle when the wall clock crosses it. New candle open timestamps are now snapped to the TF grid (`floor(now / step) * step`) so `lightweight-charts` places bars at correct x-positions with proper sizing.
- **Live Candle Stale Ref on Timeframe Switch**: Switching timeframes (e.g. 1D → 1m) no longer carries over a stale candle reference from the previous timeframe. `lastCandleRef` is now explicitly reset when `timeframe` changes, preventing immediate erroneous rollover on the new timeframe.
- **1-Tap Trade SELL Button Not Wired**: `onMarketSell` was declared in `AssetTradePanel` props but silently dropped from the component destructuring. The 1-TAP TRADE panel had no sell execution path. Fixed by correctly destructuring `onMarketSell` and adding a live **SELL** button beside the BUY button. The SELL button computes quantity from the USD amount (capped to open position size) and is visually disabled with 40% opacity when no position is held.
- **Indian Stock 84x Value Inflation in Portfolio Breakdown**: `PortfolioBreakdown` computed position values as `price × qty` without applying the `getAssetUSDMultiplier(symbol)` INR→USD conversion factor. Indian `.NS`/`.BO` assets (priced in Rupees) appeared at 84× their true USD value in the Portfolio Allocation chart. Fixed by applying the multiplier consistently, matching the rest of the trading engine.

---

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
