/**
 * Yahoo Finance v8 Market Data Service
 * 
 * Directly queries Yahoo Finance v8 chart API for:
 * - US30 Spot:   https://query1.finance.yahoo.com/v8/finance/chart/^DJI?interval=5m&range=5d
 * - NASDAQ Spot: https://query1.finance.yahoo.com/v8/finance/chart/^IXIC?interval=5m&range=5d
 * - NASDAQ Futures: https://query1.finance.yahoo.com/v8/finance/chart/NQ=F?interval=5m&range=5d
 * - US30 Futures:   https://query1.finance.yahoo.com/v8/finance/chart/YM=F?interval=5m&range=5d
 */

import { CandleData, SymbolInfo, Timeframe } from '../types/chart';

export const SUPPORTED_SYMBOLS: SymbolInfo[] = [
  {
    symbol: 'US30',
    displayName: 'Dow Jones (Spot ^DJI)',
    ticker: '^DJI',
    exchange: 'DJI',
    precision: 2,
    pipSize: 1.0,
    basePrice: 51778.04,
    type: 'index',
  },
  {
    symbol: 'NASDAQ',
    displayName: 'Nasdaq Composite (Spot ^IXIC)',
    ticker: '^IXIC',
    exchange: 'NASDAQ',
    precision: 2,
    pipSize: 1.0,
    basePrice: 26418.30,
    type: 'index',
  },
  {
    symbol: 'YM=F',
    displayName: 'US30 Futures (YM=F 24h)',
    ticker: 'YM=F',
    exchange: 'CBOT',
    precision: 2,
    pipSize: 1.0,
    basePrice: 52310.00,
    type: 'futures',
  },
  {
    symbol: 'NQ=F',
    displayName: 'NASDAQ Futures (NQ=F 24h)',
    ticker: 'NQ=F',
    exchange: 'CME',
    precision: 2,
    pipSize: 0.25,
    basePrice: 29880.00,
    type: 'futures',
  },
];

export function getSymbolInfo(symbolName: string): SymbolInfo {
  const norm = symbolName.toUpperCase();
  const exact = SUPPORTED_SYMBOLS.find(
    (s) => s.symbol.toUpperCase() === norm || s.ticker.toUpperCase() === norm
  );
  if (exact) return exact;

  if (norm.includes('NQ')) return SUPPORTED_SYMBOLS[3];
  if (norm.includes('YM')) return SUPPORTED_SYMBOLS[2];
  if (norm.includes('NAS') || norm.includes('100') || norm.includes('IXIC')) {
    return SUPPORTED_SYMBOLS[1];
  }
  return SUPPORTED_SYMBOLS[0];
}

// 60-Second Cache Entry
interface CacheEntry {
  timestamp: number; // Date.now()
  data: CandleData[];
  regularMarketPrice?: number;
  previousClose?: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 Seconds Cache

/**
 * Fetch 1m or 5m real candles for US30 (^DJI/YM=F) or NASDAQ (^IXIC/NQ=F)
 */
export async function fetchMarketData(
  symbol: string,
  timeframe: Timeframe = '5m',
  forceRefresh: boolean = false
): Promise<{
  candles: CandleData[];
  regularMarketPrice?: number;
  previousClose?: number;
  source: string;
  cached?: boolean;
}> {
  const symbolInfo = getSymbolInfo(symbol);
  const ticker = symbolInfo.ticker || (symbol === 'NASDAQ' ? '^IXIC' : '^DJI');
  const interval = timeframe === '1m' ? '1m' : '5m';
  const range = interval === '1m' ? '1d' : '5d';

  const cacheKey = `yf_chart_${ticker}_${interval}_${range}`;

  // 1. Check Memory Cache (60s TTL)
  if (!forceRefresh) {
    const cached = memoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS) && cached.data.length > 0) {
      return {
        candles: cached.data,
        regularMarketPrice: cached.regularMarketPrice,
        previousClose: cached.previousClose,
        source: 'yahoo_finance_cache',
        cached: true,
      };
    }

    // Check LocalStorage cache
    try {
      const localStr = localStorage.getItem(cacheKey);
      if (localStr) {
        const localEntry: CacheEntry = JSON.parse(localStr);
        if (localEntry && (Date.now() - localEntry.timestamp < CACHE_TTL_MS) && localEntry.data.length > 0) {
          memoryCache.set(cacheKey, localEntry);
          return {
            candles: localEntry.data,
            regularMarketPrice: localEntry.regularMarketPrice,
            previousClose: localEntry.previousClose,
            source: 'yahoo_finance_cache',
            cached: true,
          };
        }
      }
    } catch {}
  }

  // 2. Fetch from Yahoo Finance endpoints
  const encodedTicker = encodeURIComponent(ticker);
  const primaryApiUrl = `/api/chart?symbol=${encodedTicker}&interval=${interval}&range=${range}`;
  const proxyUrl = `/api/yahoo-chart/${encodedTicker}?interval=${interval}&range=${range}`;
  const directUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedTicker}?interval=${interval}&range=${range}`;

  let rawJson: any = null;
  let fetchSource = 'yahoo_chart_api';

  const endpoints = [primaryApiUrl, proxyUrl, directUrl];

  for (const ep of endpoints) {
    try {
      const response = await fetch(ep, {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        rawJson = await response.json();
        if (rawJson?.chart?.result?.[0]?.timestamp?.length > 0) {
          fetchSource = ep.startsWith('/api/chart') ? 'yahoo_v8_real' : 'yahoo_proxy';
          break;
        }
      }
    } catch (e) {
      // Continue to next endpoint fallback
    }
  }

  // Parse Yahoo Finance v8 JSON structure
  const resultObj = rawJson?.chart?.result?.[0];
  if (resultObj) {
    const meta = resultObj.meta;
    const timestamps = resultObj.timestamp || [];
    const quote = resultObj.indicators?.quote?.[0] || {};
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const volumes = quote.volume || [];

    const parsedCandles: CandleData[] = [];
    let lastTime = -Infinity;

    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i];
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      const v = volumes[i];

      // Filter out null/undefined/NaN gaps
      if (
        t &&
        t > lastTime &&
        Number.isFinite(o) &&
        Number.isFinite(h) &&
        Number.isFinite(l) &&
        Number.isFinite(c)
      ) {
        parsedCandles.push({
          time: t,
          open: Number(o.toFixed(2)),
          high: Number(h.toFixed(2)),
          low: Number(l.toFixed(2)),
          close: Number(c.toFixed(2)),
          volume: Number.isFinite(v) ? v : 1000,
        });
        lastTime = t;
      }
    }

    if (parsedCandles.length > 0) {
      const regularMarketPrice = Number.isFinite(meta?.regularMarketPrice)
        ? meta.regularMarketPrice
        : parsedCandles[parsedCandles.length - 1].close;

      const previousClose = Number.isFinite(meta?.chartPreviousClose)
        ? meta.chartPreviousClose
        : meta?.previousClose;

      const cacheEntry: CacheEntry = {
        timestamp: Date.now(),
        data: parsedCandles,
        regularMarketPrice,
        previousClose,
      };

      // Save to memory cache & localStorage with 60s TTL
      memoryCache.set(cacheKey, cacheEntry);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      } catch {}

      return {
        candles: parsedCandles,
        regularMarketPrice,
        previousClose,
        source: fetchSource,
        cached: false,
      };
    }
  }

  // If fetch returned empty, try using previously cached data
  const fallback = memoryCache.get(cacheKey);
  if (fallback && fallback.data.length > 0) {
    return {
      candles: fallback.data,
      regularMarketPrice: fallback.regularMarketPrice,
      previousClose: fallback.previousClose,
      source: 'yahoo_finance_cache',
      cached: true,
    };
  }

  return {
    candles: [],
    source: 'error',
  };
}

/**
 * Calculate Heikin-Ashi candles from standard OHLC
 */
export function calculateHeikinAshi(candles: CandleData[]): CandleData[] {
  if (!candles || candles.length === 0) return [];
  const haCandles: CandleData[] = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;

    let haOpen: number;
    if (i === 0) {
      haOpen = (c.open + c.close) / 2;
    } else {
      haOpen = (haCandles[i - 1].open + haCandles[i - 1].close) / 2;
    }

    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);

    if (
      Number.isFinite(haOpen) &&
      Number.isFinite(haHigh) &&
      Number.isFinite(haLow) &&
      Number.isFinite(haClose)
    ) {
      haCandles.push({
        time: c.time,
        open: Number(haOpen.toFixed(2)),
        high: Number(haHigh.toFixed(2)),
        low: Number(haLow.toFixed(2)),
        close: Number(haClose.toFixed(2)),
        volume: c.volume || 1000,
      });
    }
  }

  return haCandles;
}
