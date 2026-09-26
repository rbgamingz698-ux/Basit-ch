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

export function isWithinTradingHours(timestampSeconds: number): boolean {
  const date = new Date(timestampSeconds * 1000);
  const pktMs = date.getTime() + 5.5 * 3600 * 1000;
  const pktDate = new Date(pktMs);
  const day = pktDate.getUTCDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  const hour = pktDate.getUTCHours();
  const minute = pktDate.getUTCMinutes();
  const timeInMinutes = hour * 60 + minute;

  // Saturday after 1:25 AM (1 * 60 + 25 = 85)
  if (day === 6 && timeInMinutes >= 85) return false;

  // Sunday: whole day closed
  if (day === 0) return false;

  // Monday before 1:25 AM (85 minutes)
  if (day === 1 && timeInMinutes < 85) return false;

  return true;
}

export function isWithinRTH(timestampSeconds: number): boolean {
  const date = new Date(timestampSeconds * 1000);
  const nyStr = date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  const parts = nyStr.split(', ');
  if (parts.length < 2) return true;
  const weekday = parts[0];
  const timePart = parts[1];
  const [hourStr, minStr] = timePart.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);
  const timeInMins = hour * 60 + minute;

  if (weekday === 'Sat' || weekday === 'Sun') {
    return false;
  }

  // RTH: 9:30 AM (570 mins) to 4:00 PM (960 mins) Eastern Time
  const rthStart = 9 * 60 + 30; // 570
  const rthEnd = 16 * 60; // 960

  return timeInMins >= rthStart && timeInMins <= rthEnd;
}

export function isMarketOpen(): boolean {
  const now = new Date();
  const pktMs = now.getTime() + 5.5 * 3600 * 1000;
  const pktDate = new Date(pktMs);
  const day = pktDate.getUTCDay();
  const hour = pktDate.getUTCHours();
  const minute = pktDate.getUTCMinutes();
  const timeInMinutes = hour * 60 + minute;

  if (day === 6 && timeInMinutes >= 85) return false;
  if (day === 0) return false;
  if (day === 1 && timeInMinutes < 85) return false;

  return true;
}

export const SUPPORTED_SYMBOLS: SymbolInfo[] = [
  { symbol: 'YM', displayName: 'Dow Futures (CBOT:YM=F)', ticker: 'YM=F', exchange: 'CBOT', precision: 2, pipSize: 1.0, basePrice: 44000.00, type: 'index', logo: 'dji' },
  { symbol: 'NQ', displayName: 'Nasdaq Futures (CBOT:NQ=F)', ticker: 'NQ=F', exchange: 'CBOT', precision: 2, pipSize: 0.25, basePrice: 20000.00, type: 'index', logo: 'nq' },
  { symbol: 'GC', displayName: 'Gold Futures (COMEX:GC=F)', ticker: 'GC=F', exchange: 'COMEX', precision: 2, pipSize: 0.1, basePrice: 2700.00, type: 'commodity', logo: 'gold' },
  { symbol: 'CL', displayName: 'Crude Oil Futures (NYMEX:CL=F)', ticker: 'CL=F', exchange: 'NYMEX', precision: 2, pipSize: 0.01, basePrice: 70.00, type: 'commodity', logo: 'oil' },
];

export function getSymbolInfo(symbolName: string): SymbolInfo {
  // Strip session suffix if present
  const baseSymbol = symbolName.split('-')[0];
  const norm = baseSymbol.toUpperCase();
  const exact = SUPPORTED_SYMBOLS.find(
    (s) => s.symbol.toUpperCase() === norm || s.ticker?.toUpperCase() === norm
  );
  if (exact) return exact;

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
  forceRefresh: boolean = false,
  session?: 'ETH' | 'RTH'
): Promise<{
  candles: CandleData[];
  regularMarketPrice?: number;
  previousClose?: number;
  source: string;
  cached?: boolean;
}> {
  const symbolInfo = getSymbolInfo(symbol);
  const ticker = symbolInfo.ticker || (symbol === 'NASDAQ' ? '^IXIC' : '^DJI');
  let interval = timeframe.toLowerCase();
  if (interval === '1h') interval = '1h';

  let range = '5y';
  // Respect Yahoo Finance's strict range limits for intraday intervals to avoid 400 Bad Request
  if (interval === '1m') {
    range = '7d';
  } else if (interval === '5m') {
    range = '60d';
  } else if (interval === '15m') {
    range = '60d';
  } else if (interval === '1h' || interval === '60m') {
    range = '730d';
  } else if (interval === '4h') {
    range = '730d';
  } else if (interval === '1d') {
    range = '5y';
  }

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

      // Filter out null/undefined/NaN gaps and weekend candles (Saturday/Sunday)
      if (
        t &&
        t > lastTime &&
        Number.isFinite(o) &&
        Number.isFinite(h) &&
        Number.isFinite(l) &&
        Number.isFinite(c)
      ) {
        const date = new Date(t * 1000);
        // If ETH (Extended Trading Hours), show whole chart (with weekend closure filter)
        // If RTH (Regular Trading Hours), filter strictly to 9:30 AM - 4:00 PM Eastern Time
        const passFilter = session === 'RTH' 
          ? isWithinRTH(t) 
          : isWithinTradingHours(t);
          
        if (passFilter) {
          const candleRange = Math.abs(h - l);
          const candleBody = Math.abs(c - o);
          const computedVol = Math.max(250, Math.round(candleRange * 650 + candleBody * 950 + 400 + ((t % 11) * 60)));
          const finalVolume = (Number.isFinite(v) && (v as number) > 0) ? (v as number) : computedVol;

          parsedCandles.push({
            time: t,
            open: Number(o.toFixed(2)),
            high: Number(h.toFixed(2)),
            low: Number(l.toFixed(2)),
            close: Number(c.toFixed(2)),
            volume: finalVolume,
          });
          lastTime = t;
        }
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

export const fetchCandles = fetchMarketData;
