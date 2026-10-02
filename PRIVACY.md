# Privacy Policy — DailyTrade

**Last Updated: September 2026**

DailyTrade is built from the ground up to respect and protect your privacy. As a 100% free and open-source paper trading simulator, our philosophy is simple: **your data belongs entirely to you.**

---

## 1. Information We Do NOT Collect
* **No Personal Data**: We do not collect names, email addresses, phone numbers, IP logs, or physical locations.
* **No Account Registration**: You can trade immediately without signing up, creating passwords, or providing credentials.
* **No Financial Information**: DailyTrade uses 100% simulated virtual currency. No credit cards, bank accounts, or real funds are ever connected or processed.
* **No Third-Party Analytics or Trackers**: We do not include Google Analytics, Firebase, Facebook Pixel, Mixpanel, or any tracking SDKs.
* **Zero Telemetry**: No crash reporting telemetry or background telemetry is sent to any proprietary servers.

---

## 2. On-Device Local Storage
All your trading activity and preferences are stored exclusively on your device using browser `localStorage` (or WebView sandbox in the Android APK):
* Simulated portfolio balance and cash
* Open trading positions, pending limit orders, and closed trade history
* Watchlist favorites and active account preferences

**Data Ownership**: You can export your entire portfolio history at any time as a JSON file via the Accounts menu, or completely wipe it by clearing your app data or clicking "Reset".

---

## 3. Network Requests & Live Market Feeds
DailyTrade connects to public financial endpoints solely to fetch real-time market quotes and candlestick charts:
* **Binance Public WebSocket API (`wss://stream.binance.com:9443`)**: Used for streaming real-time cryptocurrency tick data.
* **Yahoo Finance Public Endpoints (`query1.finance.yahoo.com`)**: Used for retrieving live quotes and historical candlestick bars for global equities, commodities, forex, and Treasury yields.

These connections transmit only standard HTTP/WebSocket requests for symbol quotes. No identifiers, cookies, or user profile data are included in these requests.

---

## 4. Open Source & Auditability
DailyTrade's entire source code is publicly accessible and licensed under the permissive **MIT License**. Anyone is free to audit, verify, and inspect our code repository to confirm our privacy commitments.

---

## 5. Contact & Support
If you have any questions or feedback regarding this Privacy Policy or DailyTrade:
* **GitHub**: [@luxie47](https://github.com/luxie47)
* **Discord**: `Luxie47`
* **Email**: `luxiee47@gmail.com`
* **Developer Project**: [DailyFlow](https://dailyflow-luxie.vercel.app)
