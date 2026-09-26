import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchMarketData, getSymbolInfo } from '../services/marketData';
import { CandleData, Timeframe } from '../types/chart';

export interface AdvancedSymbolState {
  symbol: string;
  previousSymbol: string;
  lastPrice: number;
  priceChange: number;
  isLoading: boolean;
  candles: CandleData[];
  lastUpdated: number;
}

/**
 * Advanced Symbol Manager Hook with Auto-Detection & Live Price Spawning on Switch
 */
export function useAdvancedSymbolManager(initialSymbol: string = 'DJI', timeframe: Timeframe = '5m') {
  const [symbol, setSymbolState] = useState<string>(initialSymbol);
  const [previousSymbol, setPreviousSymbol] = useState<string>(initialSymbol);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const symbolInfo = getSymbolInfo(symbol);
  const previousSymbolRef = useRef<string>(initialSymbol);

  const setSymbol = useCallback((newSymbol: string) => {
    if (newSymbol !== previousSymbolRef.current) {
      setPreviousSymbol(previousSymbolRef.current);
      previousSymbolRef.current = newSymbol;
      setSymbolState(newSymbol);
    }
  }, []);

  // Fetch live market data & auto-detect symbol switch
  const loadSymbolData = useCallback(async (targetSymbol: string, tf: Timeframe) => {
    setIsLoading(true);
    try {
      const [baseSymbol, session] = targetSymbol.split('-');
      const result = await fetchMarketData(baseSymbol, tf, true, session as 'ETH' | 'RTH' | undefined);
      if (result && result.candles && result.candles.length > 0) {
        setCandles(result.candles);
      } else {
        // Fallback generator
        const generated: CandleData[] = [];
        let baseP = getSymbolInfo(targetSymbol).basePrice;
        const now = Math.floor(Date.now() / 300000) * 300000;
        for (let i = 60; i > 0; i--) {
          const time = now - i * 300000;
          const open = baseP + (Math.random() * 10 - 5);
          const close = open + (Math.random() * 14 - 7);
          const high = Math.max(open, close) + Math.random() * 5;
          const low = Math.min(open, close) - Math.random() * 5;
          const volume = Math.round(Math.random() * 500 + 100);
          generated.push({ time, open, high, low, close, volume });
          baseP = close;
        }
        setCandles(generated);
      }
      setLastUpdated(Date.now());
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSymbolData(symbol, timeframe);
    const interval = setInterval(() => {
      loadSymbolData(symbol, timeframe);
    }, 15000);
    return () => clearInterval(interval);
  }, [symbol, timeframe, loadSymbolData]);

  const lastCandle = candles[candles.length - 1];
  const lastPrice = lastCandle ? lastCandle.close : symbolInfo.basePrice;
  const prevCandle = candles[candles.length - 2];
  const prevClose = prevCandle ? prevCandle.close : symbolInfo.basePrice;
  const priceChange = lastPrice - prevClose;

  return {
    symbol,
    previousSymbol,
    setSymbol,
    candles,
    lastPrice,
    priceChange,
    isLoading,
    lastUpdated,
    symbolInfo,
  };
}
