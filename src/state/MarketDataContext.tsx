import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Candle, Asset, Timeframe } from '../types/market';
import { STORAGE_KEYS } from '../config/constants';
import { checkAlerts } from '../services/priceAlerts';
import {
  fetchBinanceCandles,
  fetchCandles,
  fetchYahooQuote,
  subscribeLiveQuote,
  subscribeAllQuotes,
  startSyntheticTicks,
  getBaselinePrice,
} from '../services/marketData';

interface MarketDataContextValue {
  prices: Record<string, number>;
  livePrice: number | null;
  candles: Candle[];
  loadingCandles: boolean;
  updatePrices: (update: Record<string, number>) => void;
  getPrice: (symbol: string) => number;
}

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

interface Props {
  children: ReactNode;
  selectedAsset: Asset;
  timeframe: Timeframe;
  onPriceUpdate?: (prices: Record<string, number>) => void;
}

export function MarketDataProvider({
  children,
  selectedAsset,
  timeframe,
  onPriceUpdate,
}: Props) {
  const [prices, setPrices] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.PRICES_CACHE);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loadingCandles, setLoadingCandles] = useState(true);

  const updatePrices = useCallback((update: Record<string, number>) => {
    setPrices(prev => {
      const next = { ...prev, ...update };
      try {
        localStorage.setItem(STORAGE_KEYS.PRICES_CACHE, JSON.stringify(next));
      } catch {
        // ignore localStorage quota errors
      }
      checkAlerts(next);
      onPriceUpdate?.(next);
      return next;
    });
  }, [onPriceUpdate]);

  const getPrice = useCallback((symbol: string): number => {
    return (selectedAsset.symbol === symbol && livePrice) ? livePrice : (prices[symbol] ?? 0);
  }, [prices, livePrice, selectedAsset.symbol]);

  // Always-on crypto stream
  useEffect(() => {
    const unsub = subscribeAllQuotes((q) => {
      updatePrices({ [q.symbol]: q.price });
    });
    return unsub;
  }, [updatePrices]);

  // Load historical candles
  useEffect(() => {
    const controller = new AbortController();
    setLoadingCandles(true);
    // Keep existing candles visible while loading new data to avoid blank chart flash on phones
    const isCrypto = selectedAsset.class === 'crypto';
    const loadCandles = isCrypto
      ? fetchBinanceCandles(selectedAsset.quoteSymbol, timeframe, controller.signal)
      : fetchCandles(selectedAsset.quoteSymbol, timeframe, controller.signal);

    loadCandles.then(data => {
      setCandles(data);
      setLoadingCandles(false);
    }).catch(() => {
      // Aborted or fallback
    });

    return () => controller.abort();
  }, [selectedAsset, timeframe]);

  // Subscribe live price for selected asset
  useEffect(() => {
    const isCrypto = selectedAsset.class === 'crypto';
    let stopSynthetic: (() => void) | null = null;

    if (isCrypto) {
      let cancelled = false;
      let stopCryptoSynthetic: (() => void) | null = null;
      let receivedWSQuote = false;

      const yahooSymbol = selectedAsset.quoteSymbol.replace('USDT', '-USD');
      fetchYahooQuote(yahooSymbol).then(q => {
        if (cancelled || !q?.price) return;
        setLivePrice(q.price);
        updatePrices({ [selectedAsset.symbol]: q.price });

        if (!receivedWSQuote && !stopCryptoSynthetic) {
          stopCryptoSynthetic = startSyntheticTicks(selectedAsset.symbol, q.price, (price) => {
            if (cancelled || receivedWSQuote) return;
            setLivePrice(price);
            updatePrices({ [selectedAsset.symbol]: price });
          }, 1500);
        }
      });

      const unsub = subscribeLiveQuote(selectedAsset.symbol, (q) => {
        receivedWSQuote = true;
        if (stopCryptoSynthetic) {
          stopCryptoSynthetic();
          stopCryptoSynthetic = null;
        }
        setLivePrice(q.price);
        updatePrices({ [selectedAsset.symbol]: q.price });
      });

      return () => {
        cancelled = true;
        stopCryptoSynthetic?.();
        unsub();
      };
    } else {
      let cancelled = false;
      const existingPrice = prices[selectedAsset.symbol];
      if (existingPrice) {
        setLivePrice(existingPrice);
        stopSynthetic = startSyntheticTicks(selectedAsset.symbol, existingPrice, (price) => {
          if (cancelled) return;
          setLivePrice(price);
          updatePrices({ [selectedAsset.symbol]: price });
        });
      }

      fetchYahooQuote(selectedAsset.quoteSymbol).then(q => {
        if (cancelled) return;
        const targetPrice = q?.price ?? existingPrice ?? 100;
        setLivePrice(targetPrice);
        updatePrices({ [selectedAsset.symbol]: targetPrice });
        stopSynthetic?.();
        stopSynthetic = startSyntheticTicks(selectedAsset.symbol, targetPrice, (price) => {
          if (cancelled) return;
          setLivePrice(price);
          updatePrices({ [selectedAsset.symbol]: price });
        });
      });

      return () => {
        cancelled = true;
        stopSynthetic?.();
      };
    }
  }, [selectedAsset, updatePrices]);

  return (
    <MarketDataContext.Provider
      value={{
        prices,
        livePrice,
        candles,
        loadingCandles,
        updatePrices,
        getPrice,
      }}
    >
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarketData(): MarketDataContextValue {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }
  return context;
}
