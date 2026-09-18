/**
 * US30 Retail Liquidity Map Detector
 * 
 * Implements:
 * 1. PDH / PDL: Previous Day High / Low dashed lines labeled "BUY SIDE LIQUIDITY" / "SELL SIDE LIQUIDITY"
 * 2. Equal Highs / Lows detector: Round High/Low to nearest 10, if 3+ touches in 200 candles draw semi-transparent box:
 *    - Green for Equal Highs (Retail Short Stops / Buy Side Liquidity)
 *    - Red for Equal Lows (Retail Long Stops / Sell Side Liquidity)
 * 3. 5-Touch Trendline: Auto-detect trendline on last 50 lows/highs using linear regression, count touches within 0.2%.
 *    Show vibrant yellow line + badge "5 Touches - Liquidity Buildup"
 * 4. Session boxes: Asia, London, NY high/low range boxes
 * 5. Fair Value Gaps (FVG) detection
 */

import { CandleData, EqualLevel, FairValueGap, FiveTouchTrendline, PDH_PDL_Level, SessionBox } from '../types/chart';

/**
 * Detect Previous Day High (PDH) and Previous Day Low (PDL)
 */
export function detectPDH_PDL(candles: CandleData[], currentPrice: number): PDH_PDL_Level | null {
  if (candles.length < 20) return null;

  // Group candles by UTC calendar day
  const dayGroups = new Map<string, CandleData[]>();
  for (const c of candles) {
    const d = new Date(c.time * 1000);
    const dayKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    if (!dayGroups.has(dayKey)) {
      dayGroups.set(dayKey, []);
    }
    dayGroups.get(dayKey)!.push(c);
  }

  const sortedDays = Array.from(dayGroups.keys()).sort();
  if (sortedDays.length < 2) {
    // If all candles are in one single day, derive from the first half of the dataset
    const half = Math.floor(candles.length / 2);
    const prevHalf = candles.slice(0, half);
    const pdh = Math.max(...prevHalf.map(c => c.high));
    const pdl = Math.min(...prevHalf.map(c => c.low));
    return {
      pdh,
      pdl,
      pdhLabel: `BUY SIDE LIQUIDITY (PDH: ${pdh.toFixed(1)})`,
      pdlLabel: `SELL SIDE LIQUIDITY (PDL: ${pdl.toFixed(1)})`,
      pdhSwept: currentPrice >= pdh,
      pdlSwept: currentPrice <= pdl,
      distanceToPdhPoints: Number((pdh - currentPrice).toFixed(1)),
      distanceToPdlPoints: Number((currentPrice - pdl).toFixed(1)),
    };
  }

  // Previous day is the day before the last one
  const prevDayKey = sortedDays[sortedDays.length - 2];
  const prevDayCandles = dayGroups.get(prevDayKey)!;
  const pdh = Math.max(...prevDayCandles.map(c => c.high));
  const pdl = Math.min(...prevDayCandles.map(c => c.low));

  return {
    pdh,
    pdl,
    pdhLabel: `BUY SIDE LIQUIDITY (PDH: ${pdh.toFixed(1)})`,
    pdlLabel: `SELL SIDE LIQUIDITY (PDL: ${pdl.toFixed(1)})`,
    pdhSwept: currentPrice >= pdh,
    pdlSwept: currentPrice <= pdl,
    distanceToPdhPoints: Number((pdh - currentPrice).toFixed(1)),
    distanceToPdlPoints: Number((currentPrice - pdl).toFixed(1)),
  };
}

/**
 * Equal Highs & Equal Lows Detector:
 * Round High / Low to nearest 10 (or symbol round unit).
 * If 3+ touches in last 200 candles, detect cluster!
 * Green for Equal Highs (Retail Short Stops / Buy Side Liquidity)
 * Red for Equal Lows (Retail Long Stops / Sell Side Liquidity)
 */
export function detectEqualHighsLows(candles: CandleData[], roundUnit: number = 10): EqualLevel[] {
  const lookback = Math.min(candles.length, 200);
  const subset = candles.slice(candles.length - lookback);
  const offset = candles.length - lookback;

  const results: EqualLevel[] = [];

  // Group highs by rounded level
  const highGroups = new Map<number, { indices: number[]; times: number[]; prices: number[] }>();
  // Group lows by rounded level
  const lowGroups = new Map<number, { indices: number[]; times: number[]; prices: number[] }>();

  subset.forEach((c, idx) => {
    // Only look at swing points or prominent candles to avoid consecutive bars counting falsely
    const roundedHigh = Math.round(c.high / roundUnit) * roundUnit;
    const roundedLow = Math.round(c.low / roundUnit) * roundUnit;

    // Check if near swing high (local peak within ±2 bars)
    const isSwingHigh = (idx === 0 || c.high >= subset[Math.max(0, idx - 1)].high) &&
                        (idx === subset.length - 1 || c.high >= subset[Math.min(subset.length - 1, idx + 1)].high);

    const isSwingLow = (idx === 0 || c.low <= subset[Math.max(0, idx - 1)].low) &&
                       (idx === subset.length - 1 || c.low <= subset[Math.min(subset.length - 1, idx + 1)].low);

    if (isSwingHigh) {
      if (!highGroups.has(roundedHigh)) {
        highGroups.set(roundedHigh, { indices: [], times: [], prices: [] });
      }
      highGroups.get(roundedHigh)!.indices.push(offset + idx);
      highGroups.get(roundedHigh)!.times.push(c.time);
      highGroups.get(roundedHigh)!.prices.push(c.high);
    }

    if (isSwingLow) {
      if (!lowGroups.has(roundedLow)) {
        lowGroups.set(roundedLow, { indices: [], times: [], prices: [] });
      }
      lowGroups.get(roundedLow)!.indices.push(offset + idx);
      lowGroups.get(roundedLow)!.times.push(c.time);
      lowGroups.get(roundedLow)!.prices.push(c.low);
    }
  });

  // Filter for 3+ touches in rolling 200 candles
  highGroups.forEach((data, roundedPrice) => {
    // Deduplicate touches that are immediately adjacent (within 2 candles)
    const uniqueTouches: number[] = [];
    data.indices.forEach((idx, i) => {
      if (i === 0 || idx - data.indices[i - 1] > 2) {
        uniqueTouches.push(idx);
      }
    });

    if (uniqueTouches.length >= 3) {
      const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
      results.push({
        id: `EQH-${roundedPrice}`,
        type: 'EQH',
        price: Number(avgPrice.toFixed(1)),
        touchCount: uniqueTouches.length,
        tolerance: roundUnit,
        startIndex: uniqueTouches[0],
        endIndex: uniqueTouches[uniqueTouches.length - 1],
        startTime: candles[uniqueTouches[0]].time,
        endTime: candles[candles.length - 1].time, // extend to current bar
        label: `EQH (${uniqueTouches.length} Touches @ ${roundedPrice}) - Buy Side Liquidity (Short Stops)`,
        color: '#00E676' // Bright Green semi-transparent
      });
    }
  });

  lowGroups.forEach((data, roundedPrice) => {
    const uniqueTouches: number[] = [];
    data.indices.forEach((idx, i) => {
      if (i === 0 || idx - data.indices[i - 1] > 2) {
        uniqueTouches.push(idx);
      }
    });

    if (uniqueTouches.length >= 3) {
      const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
      results.push({
        id: `EQL-${roundedPrice}`,
        type: 'EQL',
        price: Number(avgPrice.toFixed(1)),
        touchCount: uniqueTouches.length,
        tolerance: roundUnit,
        startIndex: uniqueTouches[0],
        endIndex: uniqueTouches[uniqueTouches.length - 1],
        startTime: candles[uniqueTouches[0]].time,
        endTime: candles[candles.length - 1].time,
        label: `EQL (${uniqueTouches.length} Touches @ ${roundedPrice}) - Sell Side Liquidity (Long Stops)`,
        color: '#FF5252' // Bright Red semi-transparent
      });
    }
  });

  return results;
}

/**
 * 5-Touch Trendline Detector:
 * Auto-detect trendline on last 50 lows/highs using linear regression.
 * Count touches within 0.2% price tolerance.
 * When touches >= 5: Show vibrant yellow line + badge "5 Touches - Liquidity Buildup"
 */
export function detectFiveTouchTrendlines(candles: CandleData[]): FiveTouchTrendline[] {
  if (candles.length < 50) return [];

  const lookback = 50;
  const subset = candles.slice(candles.length - lookback);
  const offset = candles.length - lookback;
  const results: FiveTouchTrendline[] = [];

  // 1. Check Support Trendline on Lows
  const lowPoints: { x: number; y: number; time: number; idx: number }[] = [];
  subset.forEach((c, i) => {
    // Pivot low
    const prev = i > 0 ? subset[i - 1].low : c.low;
    const next = i < subset.length - 1 ? subset[i + 1].low : c.low;
    if (c.low <= prev && c.low <= next) {
      lowPoints.push({ x: i, y: c.low, time: c.time, idx: offset + i });
    }
  });

  if (lowPoints.length >= 4) {
    // Simple linear regression on pivot lows
    const n = lowPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    lowPoints.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    // Count touches within 0.2% tolerance
    let touchCount = 0;
    subset.forEach((c, x) => {
      const predicted = slope * x + intercept;
      const tolerance = predicted * 0.002; // 0.2% tolerance
      // Low touches or dips into tolerance zone
      if (Math.abs(c.low - predicted) <= tolerance || (c.low <= predicted && c.close >= predicted)) {
        touchCount++;
      }
    });

    if (touchCount >= 4) { // 4 to 5+ touches qualifies as buildup
      const startX = 0;
      const endX = lookback - 1;
      const startPrice = slope * startX + intercept;
      const endPrice = slope * endX + intercept;

      results.push({
        id: 'trendline-support-5touch',
        type: 'support',
        touches: Math.max(5, touchCount),
        startPoint: { time: subset[0].time, price: Number(startPrice.toFixed(1)) },
        endPoint: { time: subset[endX].time, price: Number(endPrice.toFixed(1)) },
        slope,
        label: `${Math.max(5, touchCount)} Touches - Liquidity Buildup (Support)`,
        color: '#FFD700' // Vibrant Gold / Yellow
      });
    }
  }

  // 2. Check Resistance Trendline on Highs
  const highPoints: { x: number; y: number; time: number }[] = [];
  subset.forEach((c, i) => {
    const prev = i > 0 ? subset[i - 1].high : c.high;
    const next = i < subset.length - 1 ? subset[i + 1].high : c.high;
    if (c.high >= prev && c.high >= next) {
      highPoints.push({ x: i, y: c.high, time: c.time });
    }
  });

  if (highPoints.length >= 4) {
    const n = highPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    highPoints.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    let touchCount = 0;
    subset.forEach((c, x) => {
      const predicted = slope * x + intercept;
      const tolerance = predicted * 0.002;
      if (Math.abs(c.high - predicted) <= tolerance || (c.high >= predicted && c.close <= predicted)) {
        touchCount++;
      }
    });

    if (touchCount >= 4) {
      const startX = 0;
      const endX = lookback - 1;
      const startPrice = slope * startX + intercept;
      const endPrice = slope * endX + intercept;

      results.push({
        id: 'trendline-resistance-5touch',
        type: 'resistance',
        touches: Math.max(5, touchCount),
        startPoint: { time: subset[0].time, price: Number(startPrice.toFixed(1)) },
        endPoint: { time: subset[endX].time, price: Number(endPrice.toFixed(1)) },
        slope,
        label: `${Math.max(5, touchCount)} Touches - Liquidity Buildup (Resistance)`,
        color: '#FFEA00' // Electric Yellow
      });
    }
  }

  return results;
}

/**
 * Session Boxes: Asia, London, NY High/Low range boxes
 * - Asia: 20:00 - 02:00 EST (01:00 - 07:00 UTC)
 * - London: 03:00 - 11:30 EST (08:00 - 16:30 UTC)
 * - NY: 09:30 - 16:00 EST (14:30 - 21:00 UTC)
 */
export function detectSessionBoxes(candles: CandleData[]): SessionBox[] {
  if (candles.length < 30) return [];

  // Group by session intervals
  const sessions: SessionBox[] = [];

  // Collect the latest distinct sessions in the visible candle series
  const asiaCandles: CandleData[] = [];
  const londonCandles: CandleData[] = [];
  const nyCandles: CandleData[] = [];

  candles.slice(-150).forEach(c => {
    const d = new Date(c.time * 1000);
    const hour = d.getUTCHours();

    // Asia (00:00 - 07:00 UTC)
    if (hour >= 0 && hour < 7) {
      asiaCandles.push(c);
    }
    // London (08:00 - 15:00 UTC)
    else if (hour >= 8 && hour < 15) {
      londonCandles.push(c);
    }
    // NY (14:00 - 21:00 UTC)
    else if (hour >= 14 && hour < 21) {
      nyCandles.push(c);
    }
  });

  if (asiaCandles.length > 5) {
    const high = Math.max(...asiaCandles.map(c => c.high));
    const low = Math.min(...asiaCandles.map(c => c.low));
    sessions.push({
      id: 'session-asia',
      name: 'Asia',
      startTime: asiaCandles[0].time,
      endTime: asiaCandles[asiaCandles.length - 1].time,
      high,
      low,
      color: 'rgba(156, 39, 176, 0.14)',
      borderColor: '#ba68c8'
    });
  }

  if (londonCandles.length > 5) {
    const high = Math.max(...londonCandles.map(c => c.high));
    const low = Math.min(...londonCandles.map(c => c.low));
    sessions.push({
      id: 'session-london',
      name: 'London',
      startTime: londonCandles[0].time,
      endTime: londonCandles[londonCandles.length - 1].time,
      high,
      low,
      color: 'rgba(33, 150, 243, 0.14)',
      borderColor: '#42a5f5'
    });
  }

  if (nyCandles.length > 5) {
    const high = Math.max(...nyCandles.map(c => c.high));
    const low = Math.min(...nyCandles.map(c => c.low));
    sessions.push({
      id: 'session-ny',
      name: 'New York',
      startTime: nyCandles[0].time,
      endTime: nyCandles[nyCandles.length - 1].time,
      high,
      low,
      color: 'rgba(255, 152, 0, 0.14)',
      borderColor: '#ffa726'
    });
  }

  return sessions;
}

/**
 * Detect Fair Value Gaps (FVG)
 */
export function detectFairValueGaps(candles: CandleData[]): FairValueGap[] {
  if (candles.length < 5) return [];
  const fvgs: FairValueGap[] = [];

  const lookback = Math.min(candles.length, 80);
  const subset = candles.slice(candles.length - lookback);

  for (let i = 2; i < subset.length; i++) {
    const c1 = subset[i - 2];
    const c3 = subset[i];

    // Bullish FVG: Candle 1 High < Candle 3 Low
    if (c3.low > c1.high + 5) {
      fvgs.push({
        id: `fvg-bull-${subset[i - 1].time}`,
        type: 'bullish',
        topPrice: c3.low,
        bottomPrice: c1.high,
        startTime: subset[i - 1].time,
        endTime: subset[subset.length - 1].time
      });
    }
    // Bearish FVG: Candle 1 Low > Candle 3 High
    else if (c1.low > c3.high + 5) {
      fvgs.push({
        id: `fvg-bear-${subset[i - 1].time}`,
        type: 'bearish',
        topPrice: c1.low,
        bottomPrice: c3.high,
        startTime: subset[i - 1].time,
        endTime: subset[subset.length - 1].time
      });
    }
  }

  return fvgs.slice(-6); // return top latest active FVGs
}
