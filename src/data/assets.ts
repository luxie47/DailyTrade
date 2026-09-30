import type { Asset } from '../types/market';

// ─── Master Asset Catalog — 120+ Assets ─────────────────────────────────────────
export const ASSETS: Asset[] = [

  // ── 1. Cryptocurrency (24/7 Binance WebSocket) ───────────────────────────────
  { symbol:'BTCUSDT',   name:'Bitcoin',          class:'crypto',    quoteSymbol:'BTCUSDT',       iconLetters:'BTC',  iconColor:'#f59e0b' },
  { symbol:'ETHUSDT',   name:'Ethereum',          class:'crypto',    quoteSymbol:'ETHUSDT',       iconLetters:'ETH',  iconColor:'#6366f1' },
  { symbol:'SOLUSDT',   name:'Solana',            class:'crypto',    quoteSymbol:'SOLUSDT',       iconLetters:'SOL',  iconColor:'#9945ff' },
  { symbol:'BNBUSDT',   name:'BNB',               class:'crypto',    quoteSymbol:'BNBUSDT',       iconLetters:'BNB',  iconColor:'#f0b90b' },
  { symbol:'XRPUSDT',   name:'XRP / Ripple',      class:'crypto',    quoteSymbol:'XRPUSDT',       iconLetters:'XRP',  iconColor:'#0ea5e9' },
  { symbol:'DOGEUSDT',  name:'Dogecoin',          class:'crypto',    quoteSymbol:'DOGEUSDT',      iconLetters:'DOGE', iconColor:'#eab308' },
  { symbol:'ADAUSDT',   name:'Cardano',           class:'crypto',    quoteSymbol:'ADAUSDT',       iconLetters:'ADA',  iconColor:'#3b82f6' },
  { symbol:'AVAXUSDT',  name:'Avalanche',         class:'crypto',    quoteSymbol:'AVAXUSDT',      iconLetters:'AVAX', iconColor:'#e84142' },
  { symbol:'LINKUSDT',  name:'Chainlink',         class:'crypto',    quoteSymbol:'LINKUSDT',      iconLetters:'LINK', iconColor:'#2a5ada' },
  { symbol:'DOTUSDT',   name:'Polkadot',          class:'crypto',    quoteSymbol:'DOTUSDT',       iconLetters:'DOT',  iconColor:'#e6007a' },
  { symbol:'MATICUSDT', name:'Polygon',           class:'crypto',    quoteSymbol:'MATICUSDT',     iconLetters:'MATIC',iconColor:'#8247e5' },
  { symbol:'LTCUSDT',   name:'Litecoin',          class:'crypto',    quoteSymbol:'LTCUSDT',       iconLetters:'LTC',  iconColor:'#bfbbbb' },
  { symbol:'SHIBUSDT',  name:'Shiba Inu',         class:'crypto',    quoteSymbol:'SHIBUSDT',      iconLetters:'SHIB', iconColor:'#ff6b35' },
  { symbol:'UNIUSDT',   name:'Uniswap',           class:'crypto',    quoteSymbol:'UNIUSDT',       iconLetters:'UNI',  iconColor:'#ff007a' },
  { symbol:'TRXUSDT',   name:'TRON',              class:'crypto',    quoteSymbol:'TRXUSDT',       iconLetters:'TRX',  iconColor:'#ef0027' },

  // ── 2. Commodities, Oil & Energy (Yahoo Finance) ───────────────────────────
  { symbol:'CL=F',      name:'Crude Oil WTI',     class:'commodity', quoteSymbol:'CL=F',          iconLetters:'WTI',  iconColor:'#374151' },
  { symbol:'BZ=F',      name:'Brent Crude Oil',   class:'commodity', quoteSymbol:'BZ=F',          iconLetters:'BRENT',iconColor:'#1f2937' },
  { symbol:'NG=F',      name:'Natural Gas',       class:'commodity', quoteSymbol:'NG=F',          iconLetters:'GAS',  iconColor:'#3b82f6' },
  { symbol:'RB=F',      name:'RBOB Gasoline',     class:'commodity', quoteSymbol:'RB=F',          iconLetters:'GASO', iconColor:'#f97316' },
  { symbol:'HO=F',      name:'Heating Oil',       class:'commodity', quoteSymbol:'HO=F',          iconLetters:'HEAT', iconColor:'#ea580c' },
  { symbol:'GC=F',      name:'Gold Futures',      class:'commodity', quoteSymbol:'GC=F',          iconLetters:'XAU',  iconColor:'#f59e0b' },
  { symbol:'SI=F',      name:'Silver Futures',    class:'commodity', quoteSymbol:'SI=F',          iconLetters:'XAG',  iconColor:'#9ca3af' },
  { symbol:'HG=F',      name:'Copper Futures',    class:'commodity', quoteSymbol:'HG=F',          iconLetters:'COP',  iconColor:'#d97706' },
  { symbol:'PL=F',      name:'Platinum Futures',  class:'commodity', quoteSymbol:'PL=F',          iconLetters:'PLT',  iconColor:'#e2e8f0' },

  // ── 3. US Dollars & Forex Currencies ────────────────────────────────────────
  { symbol:'DX-Y.NYB',  name:'US Dollar Index (DXY)', class:'forex', quoteSymbol:'DX-Y.NYB',      iconLetters:'DXY',  iconColor:'#10b981' },
  { symbol:'USDINR=X',  name:'USD / Indian Rupee',class:'forex',     quoteSymbol:'USDINR=X',      iconLetters:'$/₹',  iconColor:'#059669' },
  { symbol:'EURUSD=X',  name:'EUR / US Dollar',   class:'forex',     quoteSymbol:'EURUSD=X',      iconLetters:'€/$',  iconColor:'#2563eb' },
  { symbol:'GBPUSD=X',  name:'GBP / US Dollar',   class:'forex',     quoteSymbol:'GBPUSD=X',      iconLetters:'£/$',  iconColor:'#7c3aed' },
  { symbol:'USDJPY=X',  name:'USD / Japanese Yen',class:'forex',     quoteSymbol:'USDJPY=X',      iconLetters:'$/¥',  iconColor:'#dc2626' },
  { symbol:'USDCAD=X',  name:'USD / Canadian Dollar', class:'forex', quoteSymbol:'USDCAD=X',      iconLetters:'$/C$', iconColor:'#d97706' },
  { symbol:'AUDUSD=X',  name:'AUD / US Dollar',   class:'forex',     quoteSymbol:'AUDUSD=X',      iconLetters:'A$/$', iconColor:'#0d9488' },
  { symbol:'USDCHF=X',  name:'USD / Swiss Franc', class:'forex',     quoteSymbol:'USDCHF=X',      iconLetters:'$/CHF',iconColor:'#b91c1c' },

  // ── 4. Fixed Deposits, Treasuries & Bond Yields ─────────────────────────────
  { symbol:'BIL',       name:'1-3M Treasury T-Bills (FD Proxy)', class:'fixed-income', quoteSymbol:'BIL', iconLetters:'TBILL', iconColor:'#10b981' },
  { symbol:'SHY',       name:'1-3 Year Treasury Bond', class:'fixed-income', quoteSymbol:'SHY',   iconLetters:'SHY',  iconColor:'#059669' },
  { symbol:'BND',       name:'Vanguard Total Bond Market', class:'fixed-income', quoteSymbol:'BND', iconLetters:'BND', iconColor:'#0284c7' },
  { symbol:'TLT',       name:'20+ Year Treasury Bond ETF', class:'fixed-income', quoteSymbol:'TLT', iconLetters:'TLT', iconColor:'#4f46e5' },
  { symbol:'^TNX',      name:'US 10-Year Treasury Yield', class:'fixed-income', quoteSymbol:'^TNX', iconLetters:'10Y', iconColor:'#6366f1' },
  { symbol:'^TYX',      name:'US 30-Year Treasury Yield', class:'fixed-income', quoteSymbol:'^TYX', iconLetters:'30Y', iconColor:'#4338ca' },
  { symbol:'LIQUIDBEES.NS', name:'Liquid BeES (Indian FD Yield)', class:'fixed-income', quoteSymbol:'LIQUIDBEES.NS', iconLetters:'LQID', iconColor:'#16a34a' },

  // ── 5. Mutual Funds & ETFs of All Types ─────────────────────────────────────
  // Core Index Funds
  { symbol:'VOO',       name:'Vanguard S&P 500 Index Fund', class:'fund', quoteSymbol:'VOO',      iconLetters:'VOO',  iconColor:'#3b82f6' },
  { symbol:'SPY',       name:'SPDR S&P 500 Trust',          class:'fund', quoteSymbol:'SPY',      iconLetters:'SPY',  iconColor:'#2563eb' },
  { symbol:'QQQ',       name:'Invesco QQQ Nasdaq-100 Fund', class:'fund', quoteSymbol:'QQQ',      iconLetters:'QQQ',  iconColor:'#8b5cf6' },
  { symbol:'VTI',       name:'Vanguard Total Stock Market', class:'fund', quoteSymbol:'VTI',      iconLetters:'VTI',  iconColor:'#10b981' },
  { symbol:'IWM',       name:'iShares Russell 2000 Small-Cap', class:'fund', quoteSymbol:'IWM',   iconLetters:'IWM',  iconColor:'#06b6d4' },
  // Sector & Thematic Mutual Funds
  { symbol:'VUG',       name:'Vanguard Large-Cap Growth Fund', class:'fund', quoteSymbol:'VUG',   iconLetters:'VUG',  iconColor:'#6366f1' },
  { symbol:'VTV',       name:'Vanguard Value Equity Fund',  class:'fund', quoteSymbol:'VTV',      iconLetters:'VTV',  iconColor:'#0d9488' },
  { symbol:'SCHD',      name:'Schwab US Dividend Equity Fund', class:'fund', quoteSymbol:'SCHD',  iconLetters:'SCHD', iconColor:'#15803d' },
  { symbol:'SMH',       name:'VanEck Semiconductor ETF',    class:'fund', quoteSymbol:'SMH',      iconLetters:'SMH',  iconColor:'#7c3aed' },
  { symbol:'XLK',       name:'Technology Select SPDR Fund', class:'fund', quoteSymbol:'XLK',      iconLetters:'XLK',  iconColor:'#3b82f6' },
  { symbol:'XLE',       name:'Energy Select SPDR Fund',     class:'fund', quoteSymbol:'XLE',      iconLetters:'XLE',  iconColor:'#ea580c' },
  { symbol:'XLF',       name:'Financial Select SPDR Fund',  class:'fund', quoteSymbol:'XLF',      iconLetters:'XLF',  iconColor:'#1d4ed8' },
  { symbol:'XLV',       name:'Healthcare Select SPDR Fund', class:'fund', quoteSymbol:'XLV',      iconLetters:'XLV',  iconColor:'#ec4899' },
  { symbol:'ARKK',      name:'ARK Innovation Disruptive Fund', class:'fund', quoteSymbol:'ARKK',  iconLetters:'ARKK', iconColor:'#f43f5e' },
  { symbol:'GLD',       name:'SPDR Gold Shares Trust',      class:'fund', quoteSymbol:'GLD',      iconLetters:'GLD',  iconColor:'#f59e0b' },
  // Indian Mutual Funds & Indices
  { symbol:'NIFTYBEES.NS',  name:'Nippon Nifty 50 BeES',    class:'fund', quoteSymbol:'NIFTYBEES.NS',  iconLetters:'N50',  iconColor:'#f97316' },
  { symbol:'BANKBEES.NS',   name:'Nippon Nifty Bank BeES',  class:'fund', quoteSymbol:'BANKBEES.NS',   iconLetters:'BNK',  iconColor:'#0284c7' },
  { symbol:'JUNIORBEES.NS', name:'Nippon Junior BeES (Next 50)', class:'fund', quoteSymbol:'JUNIORBEES.NS', iconLetters:'JR50', iconColor:'#d97706' },
  { symbol:'GOLDBEES.NS',   name:'Nippon Gold BeES ETF',    class:'fund', quoteSymbol:'GOLDBEES.NS',   iconLetters:'GOLD', iconColor:'#eab308' },
  { symbol:'MON100.NS',     name:'Motilal Oswal Nasdaq 100',class:'fund', quoteSymbol:'MON100.NS',     iconLetters:'M100', iconColor:'#7c3aed' },

  // ── 6. US Mega-Cap Tech & Growth ──────────────────────────────────────────
  { symbol:'AAPL',      name:'Apple',             class:'stock',     quoteSymbol:'AAPL',          iconLetters:'AAPL' },
  { symbol:'MSFT',      name:'Microsoft',         class:'stock',     quoteSymbol:'MSFT',          iconLetters:'MSFT' },
  { symbol:'NVDA',      name:'NVIDIA',            class:'stock',     quoteSymbol:'NVDA',          iconLetters:'NVDA', iconColor:'#76b900' },
  { symbol:'GOOGL',     name:'Alphabet / Google', class:'stock',     quoteSymbol:'GOOGL',         iconLetters:'GOOG', iconColor:'#4285f4' },
  { symbol:'META',      name:'Meta Platforms',    class:'stock',     quoteSymbol:'META',          iconLetters:'META', iconColor:'#0866ff' },
  { symbol:'AMZN',      name:'Amazon',            class:'stock',     quoteSymbol:'AMZN',          iconLetters:'AMZN', iconColor:'#ff9900' },
  { symbol:'TSLA',      name:'Tesla',             class:'stock',     quoteSymbol:'TSLA',          iconLetters:'TSLA', iconColor:'#cc0000' },
  { symbol:'AVGO',      name:'Broadcom',          class:'stock',     quoteSymbol:'AVGO',          iconLetters:'AVGO', iconColor:'#cc0000' },
  { symbol:'NFLX',      name:'Netflix',           class:'stock',     quoteSymbol:'NFLX',          iconLetters:'NFLX', iconColor:'#e50914' },
  { symbol:'AMD',       name:'AMD',               class:'stock',     quoteSymbol:'AMD',           iconLetters:'AMD',  iconColor:'#ed1c24' },
  { symbol:'QCOM',      name:'Qualcomm',          class:'stock',     quoteSymbol:'QCOM',          iconLetters:'QCOM', iconColor:'#0033a0' },
  { symbol:'INTC',      name:'Intel',             class:'stock',     quoteSymbol:'INTC',          iconLetters:'INTC', iconColor:'#0071c5' },
  { symbol:'ORCL',      name:'Oracle',            class:'stock',     quoteSymbol:'ORCL',          iconLetters:'ORCL', iconColor:'#f80000' },
  { symbol:'CRM',       name:'Salesforce',        class:'stock',     quoteSymbol:'CRM',           iconLetters:'CRM',  iconColor:'#00a1e0' },
  { symbol:'PLTR',      name:'Palantir',          class:'stock',     quoteSymbol:'PLTR',          iconLetters:'PLTR', iconColor:'#a855f7' },
  { symbol:'UBER',      name:'Uber Technologies', class:'stock',     quoteSymbol:'UBER',          iconLetters:'UBER', iconColor:'#000000' },
  { symbol:'ABNB',      name:'Airbnb',            class:'stock',     quoteSymbol:'ABNB',          iconLetters:'ABNB', iconColor:'#ff5a5f' },
  { symbol:'COIN',      name:'Coinbase',          class:'stock',     quoteSymbol:'COIN',          iconLetters:'COIN', iconColor:'#0052ff' },

  // ── 7. US Finance, Consumer & Healthcare ────────────────────────────────────
  { symbol:'BRK-B',     name:'Berkshire Hathaway',class:'stock',     quoteSymbol:'BRK-B',         iconLetters:'BRK',  iconColor:'#1e3a8a' },
  { symbol:'JPM',       name:'JPMorgan Chase',    class:'stock',     quoteSymbol:'JPM',           iconLetters:'JPM',  iconColor:'#003087' },
  { symbol:'V',         name:'Visa',              class:'stock',     quoteSymbol:'V',             iconLetters:'VISA', iconColor:'#1a1f71' },
  { symbol:'MA',        name:'Mastercard',        class:'stock',     quoteSymbol:'MA',            iconLetters:'MA',   iconColor:'#eb001b' },
  { symbol:'BAC',       name:'Bank of America',   class:'stock',     quoteSymbol:'BAC',           iconLetters:'BAC',  iconColor:'#e31837' },
  { symbol:'GS',        name:'Goldman Sachs',     class:'stock',     quoteSymbol:'GS',            iconLetters:'GS',   iconColor:'#6699cc' },
  { symbol:'WMT',       name:'Walmart',           class:'stock',     quoteSymbol:'WMT',           iconLetters:'WMT',  iconColor:'#0071dc' },
  { symbol:'COST',      name:'Costco Wholesale',  class:'stock',     quoteSymbol:'COST',          iconLetters:'COST', iconColor:'#005dab' },
  { symbol:'KO',        name:'Coca-Cola',         class:'stock',     quoteSymbol:'KO',            iconLetters:'KO',   iconColor:'#f40009' },
  { symbol:'PEP',       name:'PepsiCo',           class:'stock',     quoteSymbol:'PEP',           iconLetters:'PEP',  iconColor:'#004b93' },
  { symbol:'MCD',       name:'McDonald\'s',       class:'stock',     quoteSymbol:'MCD',           iconLetters:'MCD',  iconColor:'#ffbc0d' },
  { symbol:'DIS',       name:'Disney',            class:'stock',     quoteSymbol:'DIS',           iconLetters:'DIS',  iconColor:'#006e99' },
  { symbol:'NKE',       name:'Nike',              class:'stock',     quoteSymbol:'NKE',           iconLetters:'NKE',  iconColor:'#f05123' },
  { symbol:'LLY',       name:'Eli Lilly',         class:'stock',     quoteSymbol:'LLY',           iconLetters:'LLY',  iconColor:'#d9262e' },
  { symbol:'JNJ',       name:'Johnson & Johnson', class:'stock',     quoteSymbol:'JNJ',           iconLetters:'JNJ',  iconColor:'#d51900' },
  { symbol:'UNH',       name:'UnitedHealth Group',class:'stock',     quoteSymbol:'UNH',           iconLetters:'UNH',  iconColor:'#002677' },
  { symbol:'XOM',       name:'Exxon Mobil',       class:'stock',     quoteSymbol:'XOM',           iconLetters:'XOM',  iconColor:'#e60000' },
  { symbol:'CVX',       name:'Chevron',           class:'stock',     quoteSymbol:'CVX',           iconLetters:'CVX',  iconColor:'#0075c9' },

  // ── 8. Indian Large-Cap (NSE Bluechips) ───────────────────────────────────
  { symbol:'RELIANCE.NS',   name:'Reliance Industries', class:'stock', quoteSymbol:'RELIANCE.NS',   iconLetters:'RIL',  iconColor:'#004b93' },
  { symbol:'TCS.NS',        name:'Tata Consultancy',    class:'stock', quoteSymbol:'TCS.NS',        iconLetters:'TCS',  iconColor:'#0f4c81' },
  { symbol:'HDFCBANK.NS',   name:'HDFC Bank',           class:'stock', quoteSymbol:'HDFCBANK.NS',   iconLetters:'HDFC', iconColor:'#004c8f' },
  { symbol:'ICICIBANK.NS',  name:'ICICI Bank',          class:'stock', quoteSymbol:'ICICIBANK.NS',  iconLetters:'ICICI',iconColor:'#b42318' },
  { symbol:'INFY.NS',       name:'Infosys',             class:'stock', quoteSymbol:'INFY.NS',       iconLetters:'INFY', iconColor:'#007cc3' },
  { symbol:'BHARTIARTL.NS', name:'Bharti Airtel',       class:'stock', quoteSymbol:'BHARTIARTL.NS', iconLetters:'ARTL', iconColor:'#e11d48' },
  { symbol:'SBIN.NS',       name:'State Bank of India', class:'stock', quoteSymbol:'SBIN.NS',       iconLetters:'SBI',  iconColor:'#0284c7' },
  { symbol:'LICI.NS',       name:'Life Insurance Corp', class:'stock', quoteSymbol:'LICI.NS',       iconLetters:'LIC',  iconColor:'#eab308' },
  { symbol:'ITC.NS',        name:'ITC Limited',         class:'stock', quoteSymbol:'ITC.NS',        iconLetters:'ITC',  iconColor:'#b91c1c' },
  { symbol:'HINDUNILVR.NS', name:'Hindustan Unilever',  class:'stock', quoteSymbol:'HINDUNILVR.NS', iconLetters:'HUL',  iconColor:'#1e40af' },
  { symbol:'LT.NS',         name:'Larsen & Toubro',     class:'stock', quoteSymbol:'LT.NS',         iconLetters:'L&T',  iconColor:'#0369a1' },
  { symbol:'BAJFINANCE.NS', name:'Bajaj Finance',       class:'stock', quoteSymbol:'BAJFINANCE.NS', iconLetters:'BAJF', iconColor:'#0284c7' },
  { symbol:'MARUTI.NS',     name:'Maruti Suzuki',       class:'stock', quoteSymbol:'MARUTI.NS',     iconLetters:'MRUT', iconColor:'#dc2626' },
  { symbol:'TATAMOTORS.NS', name:'Tata Motors',         class:'stock', quoteSymbol:'TATAMOTORS.NS', iconLetters:'TATA', iconColor:'#1d4ed8' },
  { symbol:'TATASTEEL.NS',  name:'Tata Steel',          class:'stock', quoteSymbol:'TATASTEEL.NS',  iconLetters:'TATST',iconColor:'#475569' },
  { symbol:'TITAN.NS',      name:'Titan (Tata Watches & Gold)',class:'stock',quoteSymbol:'TITAN.NS',iconLetters:'TITN',iconColor:'#ca8a04' },
  { symbol:'KOTAKBANK.NS',  name:'Kotak Mahindra Bank', class:'stock', quoteSymbol:'KOTAKBANK.NS',  iconLetters:'KOTK', iconColor:'#dc2626' },
  { symbol:'AXISBANK.NS',   name:'Axis Bank',           class:'stock', quoteSymbol:'AXISBANK.NS',   iconLetters:'AXIS', iconColor:'#881337' },
  { symbol:'SUNPHARMA.NS',  name:'Sun Pharma',          class:'stock', quoteSymbol:'SUNPHARMA.NS',  iconLetters:'SUN',  iconColor:'#f97316' },
  { symbol:'ADANIENT.NS',   name:'Adani Enterprises',   class:'stock', quoteSymbol:'ADANIENT.NS',   iconLetters:'ADAN', iconColor:'#1e293b' },
  { symbol:'WIPRO.NS',      name:'Wipro',               class:'stock', quoteSymbol:'WIPRO.NS',      iconLetters:'WIPR', iconColor:'#0891b2' },
  { symbol:'HCLTECH.NS',    name:'HCL Technologies',    class:'stock', quoteSymbol:'HCLTECH.NS',    iconLetters:'HCL',  iconColor:'#2563eb' },
  { symbol:'NTPC.NS',       name:'NTPC Power',          class:'stock', quoteSymbol:'NTPC.NS',       iconLetters:'NTPC', iconColor:'#15803d' },
  { symbol:'POWERGRID.NS',  name:'Power Grid Corp',     class:'stock', quoteSymbol:'POWERGRID.NS',  iconLetters:'PGRID',iconColor:'#047857' },
  { symbol:'ULTRACEMCO.NS', name:'UltraTech Cement',    class:'stock', quoteSymbol:'ULTRACEMCO.NS', iconLetters:'ULTRA',iconColor:'#b45309' },
  { symbol:'ZOMATO.NS',     name:'Zomato',              class:'stock', quoteSymbol:'ZOMATO.NS',     iconLetters:'ZOM',  iconColor:'#e11d48' },
];

export const ASSET_MAP: Record<string, Asset> = Object.fromEntries(
  ASSETS.map(a => [a.symbol, a])
);

// All Binance WebSocket symbols
export const BINANCE_SYMBOLS = ASSETS
  .filter(a => a.class === 'crypto')
  .map(a => a.quoteSymbol.toLowerCase());
