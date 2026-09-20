import { CandleData } from '../types/chart';
import { IndicatorDefinition, FVGItem, SessionBoxItem, OrderBlockItem, StructureLevel, LiquidityZoneItem, TrendlineLiquidityItem, VolumaticORBItem } from '../types/indicators';

export const BUILTIN_INDICATORS: IndicatorDefinition[] = [
  // VOLUMATIC ORB
  {
    id: 'volumatic_orb',
    name: 'Volumatic ORB 15min',
    category: 'VOLUMATIC',
    description: '15-minute Opening Range Breakout corridor with breakout signals.',
    defaultInputs: {
      startTime: '06:30',
      endTime: '06:45',
      utcOffset: 5,
      showBreakoutSignals: true,
      showLabels: false,
    },
    defaultStyle: {
      rangeColor: '#E040FB',
      bullishBreakColor: '#00FF68',
      bearishBreakColor: '#FF0008',
      opacity: 0.08
    },
    defaultVisibility: { seconds: true, minutes: true, hours: true, days: true, weeks: true, months: true }
  },
  // TRADING SESSIONS
  {
    id: 'sessions',
    name: 'Trading Sessions',
    category: 'SMART_MONEY_CONCEPTS',
    description: 'Asia, London, and New York session high/low range boxes.',
    defaultInputs: {
      utcOffset: 5,
      showLabels: false,
      sessionLabelName: true,
      sessionLabelHours: true,
      sessionLabelHighLow: true,
      labelHighlightBg: true,
    },
    defaultStyle: { asiaColor: '#2962FF', londonColor: '#00C853', nyColor: '#FF1744' },
    defaultVisibility: { seconds: true, minutes: true, hours: true, days: true, weeks: true, months: true }
  }
];

export function calculateEMA(candles: CandleData[], length: number, sourceKey: string = 'close'): { time: number; value: number }[] {
  if (!candles || candles.length === 0) return [];
  const k = 2 / (length + 1);
  const result: { time: number; value: number }[] = [];
  let prevEma = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const src = getSourceValue(c, sourceKey);
    if (i === 0) {
      prevEma = src;
    } else {
      prevEma = src * k + prevEma * (1 - k);
    }
    if (i >= length - 1) {
      result.push({ time: c.time, value: prevEma });
    }
  }
  return result;
}

export function calculateSMA(candles: CandleData[], length: number, sourceKey: string = 'close'): { time: number; value: number }[] {
  if (!candles || candles.length === 0 || length <= 0) return [];
  const result: { time: number; value: number }[] = [];
  for (let i = length - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - length + 1; j <= i; j++) {
      sum += getSourceValue(candles[j], sourceKey);
    }
    result.push({ time: candles[i].time, value: sum / length });
  }
  return result;
}

export function calculateRSI(candles: CandleData[], length: number = 14): { time: number; value: number }[] {
  if (!candles || candles.length < length + 1) return [];
  const result: { time: number; value: number }[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / length;
  let avgLoss = losses / length;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ time: candles[length].time, value: 100 - (100 / (1 + rs)) });

  for (let i = length + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (length - 1) + gain) / length;
    avgLoss = (avgLoss * (length - 1) + loss) / length;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: candles[i].time, value: 100 - (100 / (1 + rs)) });
  }

  return result;
}

function getSourceValue(c: CandleData, sourceKey: string): number {
  switch (sourceKey) {
    case 'open': return c.open;
    case 'high': return c.high;
    case 'low': return c.low;
    case 'hlc3': return (c.high + c.low + c.close) / 3;
    case 'hlcc4': return (c.high + c.low + c.close * 2) / 4;
    case 'close':
    default:
      return c.close;
  }
}

export function calculateFVGs(candles: CandleData[], extendBars: number = 20, threshold: number = 0.00005, bullishColor: string = '#00FF68', bearishColor: string = '#FF0008'): FVGItem[] {
  const fvgs: FVGItem[] = [];
  if (!candles || candles.length < 3) return fvgs;

  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2];
    const c1 = candles[i - 1];
    const c2 = candles[i];
    const delta = Math.abs(c1.close - c1.open) / c1.open;

    // Bullish FVG: c2.low > c0.high
    if (c2.low > c0.high && c1.close > c0.high && delta > threshold) {
      fvgs.push({
        id: `fvg-bull-${c0.time}`,
        type: 'bullish',
        topPrice: c2.low,
        bottomPrice: c0.high,
        startTime: c0.time,
        endTime: candles[Math.min(candles.length - 1, i + extendBars)].time,
        color: bullishColor
      });
    }

    // Bearish FVG: c2.high < c0.low
    if (c2.high < c0.low && c1.close < c0.low && delta > threshold) {
      fvgs.push({
        id: `fvg-bear-${c0.time}`,
        type: 'bearish',
        topPrice: c0.low,
        bottomPrice: c2.high,
        startTime: c0.time,
        endTime: candles[Math.min(candles.length - 1, i + extendBars)].time,
        color: bearishColor
      });
    }
  }
  return fvgs;
}

export function calculateSessions(candles: CandleData[], utcOffset: number = 5, asiaColor: string = '#2962FF', londonColor: string = '#00C853', nyColor: string = '#FF1744'): SessionBoxItem[] {
  const boxes: SessionBoxItem[] = [];
  if (!candles || candles.length === 0) return boxes;

  const dayMap = new Map<string, CandleData[]>();
  for (const c of candles) {
    const date = new Date(c.time * 1000);
    const adjMs = date.getTime() + utcOffset * 3600 * 1000;
    const adjDate = new Date(adjMs);
    const key = `${adjDate.getUTCFullYear()}-${String(adjDate.getUTCMonth() + 1).padStart(2, '0')}-${String(adjDate.getUTCDate()).padStart(2, '0')}`;
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(c);
  }

  dayMap.forEach((dayCandles) => {
    let asiaHigh = -Infinity, asiaLow = Infinity, asiaStart = 0, asiaEnd = 0, hasAsia = false;
    let lonHigh = -Infinity, lonLow = Infinity, lonStart = 0, lonEnd = 0, hasLon = false;
    let nyHigh = -Infinity, nyLow = Infinity, nyStart = 0, nyEnd = 0, hasNy = false;

    for (const c of dayCandles) {
      const date = new Date(c.time * 1000);
      const adjMs = date.getTime() + utcOffset * 3600 * 1000;
      const adjDate = new Date(adjMs);
      const mins = adjDate.getUTCHours() * 60 + adjDate.getUTCMinutes();

      // Asia: 06:00 (360) - 10:00 (600)
      if (mins >= 360 && mins <= 600) {
        if (!hasAsia) { asiaStart = c.time; hasAsia = true; }
        asiaHigh = Math.max(asiaHigh, c.high);
        asiaLow = Math.min(asiaLow, c.low);
        asiaEnd = c.time;
      }
      // London: 12:00 (720) - 16:00 (960)
      if (mins >= 720 && mins <= 960) {
        if (!hasLon) { lonStart = c.time; hasLon = true; }
        lonHigh = Math.max(lonHigh, c.high);
        lonLow = Math.min(lonLow, c.low);
        lonEnd = c.time;
      }
      // New York: 18:00 (1080) - 22:00 (1320)
      if (mins >= 1080 && mins <= 1320) {
        if (!hasNy) { nyStart = c.time; hasNy = true; }
        nyHigh = Math.max(nyHigh, c.high);
        nyLow = Math.min(nyLow, c.low);
        nyEnd = c.time;
      }
    }

    if (hasAsia) {
      boxes.push({ id: `asia-${asiaStart}`, name: 'Asia', startTime: asiaStart, endTime: asiaEnd, high: asiaHigh, low: asiaLow, color: hexToRgba(asiaColor, 0.08), borderColor: asiaColor });
    }
    if (hasLon) {
      boxes.push({ id: `london-${lonStart}`, name: 'London', startTime: lonStart, endTime: lonEnd, high: lonHigh, low: lonLow, color: hexToRgba(londonColor, 0.08), borderColor: londonColor });
    }
    if (hasNy) {
      boxes.push({ id: `ny-${nyStart}`, name: 'New York', startTime: nyStart, endTime: nyEnd, high: nyHigh, low: nyLow, color: hexToRgba(nyColor, 0.08), borderColor: nyColor });
    }
  });

  return boxes;
}

export interface OrderBlockFilters {
  filterBreakStructure?: boolean;
  filterFormFVG?: boolean;
  filterAfterSweep?: boolean;
  filterSessionOnly?: boolean;
  sessionUtcOffset?: number;
}

export function isCandleInSession(time: number, utcOffset: number = 5): { inSession: boolean; sessionName?: 'Asia' | 'London' | 'New York' } {
  const date = new Date(time * 1000);
  const adjMs = date.getTime() + utcOffset * 3600 * 1000;
  const adjDate = new Date(adjMs);
  const mins = adjDate.getUTCHours() * 60 + adjDate.getUTCMinutes();

  // Asia: 06:00 (360) - 10:00 (600)
  if (mins >= 360 && mins <= 600) return { inSession: true, sessionName: 'Asia' };
  // London: 12:00 (720) - 16:00 (960)
  if (mins >= 720 && mins <= 960) return { inSession: true, sessionName: 'London' };
  // New York: 18:00 (1080) - 22:00 (1320)
  if (mins >= 1080 && mins <= 1320) return { inSession: true, sessionName: 'New York' };

  return { inSession: false };
}

export function calculateOrderBlocks(
  candles: CandleData[],
  extendBars: number = 20,
  bullishColor: string = '#2962FF',
  bearishColor: string = '#FF1744',
  filters?: OrderBlockFilters
): OrderBlockItem[] {
  const obs: OrderBlockItem[] = [];
  if (!candles || candles.length < 5) return obs;

  const {
    filterBreakStructure = false,
    filterFormFVG = false,
    filterAfterSweep = false,
    filterSessionOnly = false,
    sessionUtcOffset = 5,
  } = filters || {};

  for (let i = 2; i < candles.length - 1; i++) {
    const prev = candles[i - 1]; // The candidate order block candle
    const curr = candles[i];     // The displacement candle
    
    // An order block is the last opposing candle before displacement
    const isBullish = curr.close > curr.open && prev.close < prev.open && curr.close > prev.high;
    const isBearish = curr.close < curr.open && prev.close > prev.open && curr.close < prev.low;

    if (!isBullish && !isBearish) continue;

    const obType = isBullish ? 'bullish' : 'bearish';

    // 1. Session Filter Check
    const sessionInfo = isCandleInSession(prev.time, sessionUtcOffset);
    if (filterSessionOnly && !sessionInfo.inSession) {
      continue;
    }

    // 2. Break of Structure (BOS) Check
    // When the OB forms with displacement, does the move break recent swing structure?
    let hasBOS = false;
    const lookbackBars = Math.min(20, i - 1);
    if (isBullish) {
      // Check if current or subsequent 2 candles break above highest high of recent lookback swing
      let recentHigh = -Infinity;
      for (let k = Math.max(0, i - 1 - lookbackBars); k < i - 1; k++) {
        if (candles[k].high > recentHigh) recentHigh = candles[k].high;
      }
      // Check displacement
      const maxPush = Math.max(
        curr.high,
        i + 1 < candles.length ? candles[i + 1].high : -Infinity,
        i + 2 < candles.length ? candles[i + 2].high : -Infinity
      );
      if (recentHigh !== -Infinity && maxPush > recentHigh) {
        hasBOS = true;
      }
    } else {
      // Check if current or subsequent 2 candles break below lowest low of recent lookback swing
      let recentLow = Infinity;
      for (let k = Math.max(0, i - 1 - lookbackBars); k < i - 1; k++) {
        if (candles[k].low < recentLow) recentLow = candles[k].low;
      }
      const minPush = Math.min(
        curr.low,
        i + 1 < candles.length ? candles[i + 1].low : Infinity,
        i + 2 < candles.length ? candles[i + 2].low : Infinity
      );
      if (recentLow !== Infinity && minPush < recentLow) {
        hasBOS = true;
      }
    }

    if (filterBreakStructure && !hasBOS) {
      continue;
    }

    // 3. FVG Formation Check
    // In SMC, an institutional OB creates an imbalance (FVG) immediately during the move
    let hasFVG = false;
    // Check if candle i or i+1 forms an FVG
    // For bullish: candle i+1 low > candle i-1 high (prev high)
    if (isBullish) {
      if (i + 1 < candles.length && candles[i + 1].low > prev.high) {
        hasFVG = true;
      } else if (i + 2 < candles.length && candles[i + 2].low > curr.high) {
        hasFVG = true;
      }
    } else {
      // For bearish: candle i+1 high < candle i-1 low (prev low)
      if (i + 1 < candles.length && candles[i + 1].high < prev.low) {
        hasFVG = true;
      } else if (i + 2 < candles.length && candles[i + 2].high < curr.low) {
        hasFVG = true;
      }
    }

    if (filterFormFVG && !hasFVG) {
      continue;
    }

    // 4. Liquidity Sweep Check
    // Order block formed AFTER sweeping previous liquidity (wick sweeps previous swing high/low then reverses)
    let hasSweep = false;
    const sweepLookback = Math.min(15, i - 1);
    if (isBullish) {
      // The OB candle (prev) or candle immediately before swept previous low
      // i.e., prev.low is lower than the lowest low of recent 5-15 bars, but closed back up or absorbed
      let prevRecentLow = Infinity;
      for (let k = Math.max(0, i - 1 - sweepLookback); k < i - 1; k++) {
        if (candles[k].low < prevRecentLow) prevRecentLow = candles[k].low;
      }
      if (prevRecentLow !== Infinity && prev.low < prevRecentLow) {
        hasSweep = true;
      }
    } else {
      // For bearish: prev.high swept recent high
      let prevRecentHigh = -Infinity;
      for (let k = Math.max(0, i - 1 - sweepLookback); k < i - 1; k++) {
        if (candles[k].high > prevRecentHigh) prevRecentHigh = candles[k].high;
      }
      if (prevRecentHigh !== -Infinity && prev.high > prevRecentHigh) {
        hasSweep = true;
      }
    }

    if (filterAfterSweep && !hasSweep) {
      continue;
    }

    // If passed all enabled filters, add the Order Block
    obs.push({
      id: `ob-${obType}-${prev.time}`,
      type: obType,
      topPrice: prev.high,
      bottomPrice: prev.low,
      startTime: prev.time,
      endTime: candles[Math.min(candles.length - 1, i + extendBars)].time,
      color: obType === 'bullish' ? bullishColor : bearishColor,
      hasBOS,
      hasFVG,
      hasSweep,
      inSession: sessionInfo.inSession,
      sessionName: sessionInfo.sessionName,
    });
  }

  return obs;
}

export function calculateBOS_CHoCH(candles: CandleData[], swingLength: number = 5, bosColor: string = '#2962FF', chochColor: string = '#FFD700'): StructureLevel[] {
  const levels: StructureLevel[] = [];
  if (!candles || candles.length < swingLength * 2 + 1) return levels;

  let lastSwingHigh = -1;
  let lastSwingLow = Infinity;
  let trend = 0; // 1 = bullish, -1 = bearish

  for (let i = swingLength; i < candles.length - swingLength; i++) {
    let isHigh = true;
    let isLow = true;

    for (let j = i - swingLength; j <= i + swingLength; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
    }

    if (isHigh) {
      const highPrice = candles[i].high;
      if (lastSwingHigh !== -1 && highPrice > lastSwingHigh) {
        trend = 1;
        levels.push({
          id: `bos-bull-${candles[i].time}`,
          type: 'BOS_BULL',
          price: highPrice,
          time: candles[i].time,
          label: 'BOS',
          color: bosColor
        });
      } else if (trend === -1 && highPrice > lastSwingHigh && lastSwingHigh !== -1) {
        trend = 1;
        levels.push({
          id: `choch-bull-${candles[i].time}`,
          type: 'CHoCH_BULL',
          price: highPrice,
          time: candles[i].time,
          label: 'CHoCH',
          color: chochColor
        });
      }
      lastSwingHigh = highPrice;
    }

    if (isLow) {
      const lowPrice = candles[i].low;
      if (lastSwingLow !== Infinity && lowPrice < lastSwingLow) {
        trend = -1;
        levels.push({
          id: `bos-bear-${candles[i].time}`,
          type: 'BOS_BEAR',
          price: lowPrice,
          time: candles[i].time,
          label: 'BOS',
          color: bosColor
        });
      } else if (trend === 1 && lowPrice < lastSwingLow && lastSwingLow !== Infinity) {
        trend = -1;
        levels.push({
          id: `choch-bear-${candles[i].time}`,
          type: 'CHoCH_BEAR',
          price: lowPrice,
          time: candles[i].time,
          label: 'CHoCH',
          color: chochColor
        });
      }
      lastSwingLow = lowPrice;
    }
  }

  return levels;
}

export interface LiquidityFilterOptions {
  showDayHighLow?: boolean;
  showSessionHighLow?: boolean;
  showThreeTouchEqualHL?: boolean;
  showTrendlineLiquidity?: boolean;
  tolerance?: number;
  utcOffset?: number;
  extendUntilPrice?: boolean;
  onlyShowWhenSwept?: boolean;
  showSweepVector?: boolean;
}

export interface LiquidityZonesResult {
  horizontalZones: LiquidityZoneItem[];
  trendlines: TrendlineLiquidityItem[];
}

export function calculateLiquidityZones(
  candles: CandleData[],
  styleColors: {
    pdhColor?: string;
    sessionColor?: string;
    eqColor?: string;
    trendlineColor?: string;
  } = {},
  filters?: LiquidityFilterOptions
): LiquidityZonesResult {
  const horizontalZones: LiquidityZoneItem[] = [];
  const trendlines: TrendlineLiquidityItem[] = [];

  if (!candles || candles.length < 10) {
    return { horizontalZones, trendlines };
  }

  const latestCandle = candles[candles.length - 1];

  const {
    showDayHighLow = true,
    showSessionHighLow = true,
    showThreeTouchEqualHL = true,
    showTrendlineLiquidity = true,
    tolerance = 0.0008,
    utcOffset = 5,
    extendUntilPrice = false,
    onlyShowWhenSwept = false,
  } = filters || {};

  const pdhColor = styleColors.pdhColor || '#D4AF37';
  const sessionColor = styleColors.sessionColor || '#00E676';
  const eqColor = styleColors.eqColor || '#FF9100';
  const trendlineColor = styleColors.trendlineColor || '#E040FB';

  // 1. DAY HIGH / LOW (PDH / PDL with Sweep Extension Tracking)
  if (showDayHighLow) {
    const dayMap = new Map<string, CandleData[]>();
    for (const c of candles) {
      const date = new Date(c.time * 1000);
      const adjMs = date.getTime() + utcOffset * 3600 * 1000;
      const adjDate = new Date(adjMs);
      const key = `${adjDate.getUTCFullYear()}-${String(adjDate.getUTCMonth() + 1).padStart(2, '0')}-${String(adjDate.getUTCDate()).padStart(2, '0')}`;
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key)!.push(c);
    }

    const dayKeys = Array.from(dayMap.keys()).sort();
    const latestCandle = candles[candles.length - 1];

    if (dayKeys.length >= 2) {
      // Process past completed days (trace up to 5 previous days for historical sweep context)
      const startIdx = Math.max(0, dayKeys.length - 5);
      for (let d = startIdx; d < dayKeys.length - 1; d++) {
        const dayKey = dayKeys[d];
        const dayCandles = dayMap.get(dayKey)!;
        const isImmediatePrevDay = d === dayKeys.length - 2;

        let pdh = -Infinity;
        let pdl = Infinity;
        let pdhTime = dayCandles[0].time;
        let pdlTime = dayCandles[0].time;
        for (const c of dayCandles) {
          if (c.high > pdh) { pdh = c.high; pdhTime = c.time; }
          if (c.low < pdl) { pdl = c.low; pdlTime = c.time; }
        }

        const dayEndTime = dayCandles[dayCandles.length - 1].time;

        // Scan subsequent candles to see if swept
        let pdhSwept = false;
        let pdhSweepTime = latestCandle.time;
        let pdhSweepPrice = pdh;

        let pdlSwept = false;
        let pdlSweepTime = latestCandle.time;
        let pdlSweepPrice = pdl;

        for (let i = 0; i < candles.length; i++) {
          const c = candles[i];
          if (c.time <= dayEndTime) continue;

          // Check if future candle wicks or crosses above pdh
          if (!pdhSwept && c.high > pdh) {
            pdhSwept = true;
            pdhSweepTime = c.time;
            pdhSweepPrice = c.high;
          }

          // Check if future candle wicks or crosses below pdl
          if (!pdlSwept && c.low < pdl) {
            pdlSwept = true;
            pdlSweepTime = c.time;
            pdlSweepPrice = c.low;
          }

          if (pdhSwept && pdlSwept) break;
        }

        const pdhLabel = isImmediatePrevDay
          ? (pdhSwept ? 'PDH [SWEPT]' : 'PDH [UNSWEPT]')
          : (pdhSwept ? `PDH ${dayKey.slice(5)} [SWEPT]` : `PDH ${dayKey.slice(5)} [UNSWEPT]`);

        const pdlLabel = isImmediatePrevDay
          ? (pdlSwept ? 'PDL [SWEPT]' : 'PDL [UNSWEPT]')
          : (pdlSwept ? `PDL ${dayKey.slice(5)} [SWEPT]` : `PDL ${dayKey.slice(5)} [UNSWEPT]`);

        if (!onlyShowWhenSwept || pdhSwept) {
          horizontalZones.push({
            id: `pdh-${dayKey}-${pdhTime}`,
            price: pdh,
            label: pdhLabel,
            color: pdhColor,
            time: pdhTime,
            endTime: pdhSwept ? pdhSweepTime : (extendUntilPrice ? latestCandle.time : dayEndTime),
            category: 'DAY_HL',
            isSwept: pdhSwept,
            sweepTime: pdhSwept ? pdhSweepTime : undefined,
            sweepPrice: pdhSwept ? pdhSweepPrice : undefined,
            originTime: pdhTime,
            originPrice: pdh,
            sweepExtremePrice: pdhSwept ? pdhSweepPrice : undefined,
            sweepDiff: pdhSwept ? Math.abs(pdhSweepPrice - pdh) : undefined,
            sweepDirection: 'high_sweep',
          });
        }

        if (!onlyShowWhenSwept || pdlSwept) {
          horizontalZones.push({
            id: `pdl-${dayKey}-${pdlTime}`,
            price: pdl,
            label: pdlLabel,
            color: pdhColor,
            time: pdlTime,
            endTime: pdlSwept ? pdlSweepTime : (extendUntilPrice ? latestCandle.time : dayEndTime),
            category: 'DAY_HL',
            isSwept: pdlSwept,
            sweepTime: pdlSwept ? pdlSweepTime : undefined,
            sweepPrice: pdlSwept ? pdlSweepPrice : undefined,
            originTime: pdlTime,
            originPrice: pdl,
            sweepExtremePrice: pdlSwept ? pdlSweepPrice : undefined,
            sweepDiff: pdlSwept ? Math.abs(pdl - pdlSweepPrice) : undefined,
            sweepDirection: 'low_sweep',
          });
        }
      }

      // Also include current day high/low if not set to onlyShowWhenSwept
      if (!onlyShowWhenSwept) {
        const todayKey = dayKeys[dayKeys.length - 1];
        const todayCandles = dayMap.get(todayKey)!;
        let tHigh = -Infinity, tLow = Infinity, thTime = todayCandles[0].time, tlTime = todayCandles[0].time;
        for (const c of todayCandles) {
          if (c.high > tHigh) { tHigh = c.high; thTime = c.time; }
          if (c.low < tLow) { tLow = c.low; tlTime = c.time; }
        }
        const todayEndTime = extendUntilPrice ? latestCandle.time : todayCandles[todayCandles.length - 1].time;
        horizontalZones.push({
          id: `day-high-${thTime}`,
          price: tHigh,
          label: 'Day High',
          color: pdhColor,
          time: thTime,
          endTime: todayEndTime,
          category: 'DAY_HL',
          isSwept: false,
          originTime: thTime,
          originPrice: tHigh,
        });
        horizontalZones.push({
          id: `day-low-${tlTime}`,
          price: tLow,
          label: 'Day Low',
          color: pdhColor,
          time: tlTime,
          endTime: todayEndTime,
          category: 'DAY_HL',
          isSwept: false,
          originTime: tlTime,
          originPrice: tLow,
        });
      }
    } else if (dayKeys.length === 1 && !onlyShowWhenSwept) {
      const dayCandles = dayMap.get(dayKeys[0])!;
      let dayHigh = -Infinity, dayLow = Infinity, dhTime = dayCandles[0].time, dlTime = dayCandles[0].time;
      for (const c of dayCandles) {
        if (c.high > dayHigh) { dayHigh = c.high; dhTime = c.time; }
        if (c.low < dayLow) { dayLow = c.low; dlTime = c.time; }
      }
      const dayEndTime = extendUntilPrice ? latestCandle.time : dayCandles[dayCandles.length - 1].time;
      horizontalZones.push({
        id: `day-high-${dhTime}`,
        price: dayHigh,
        label: 'Day High',
        color: pdhColor,
        time: dhTime,
        endTime: dayEndTime,
        category: 'DAY_HL',
        isSwept: false,
        originTime: dhTime,
        originPrice: dayHigh,
      });
      horizontalZones.push({
        id: `day-low-${dlTime}`,
        price: dayLow,
        label: 'Day Low',
        color: pdhColor,
        time: dlTime,
        endTime: dayEndTime,
        category: 'DAY_HL',
        isSwept: false,
        originTime: dlTime,
        originPrice: dayLow,
      });
    }
  }

  // 2. SESSION / PREVIOUS SESSION HIGH & LOW (Asia, London, New York)
  if (showSessionHighLow) {
    interface SessionRecord {
      name: 'Asia' | 'London' | 'New York';
      high: number;
      low: number;
      startTime: number;
      endTime: number;
    }
    const sessionList: SessionRecord[] = [];
    let currentSess: SessionRecord | null = null;

    for (const c of candles) {
      const sInfo = isCandleInSession(c.time, utcOffset);
      if (sInfo.inSession && sInfo.sessionName) {
        if (!currentSess || currentSess.name !== sInfo.sessionName) {
          if (currentSess) sessionList.push({ ...currentSess });
          currentSess = {
            name: sInfo.sessionName,
            high: c.high,
            low: c.low,
            startTime: c.time,
            endTime: c.time,
          };
        } else {
          currentSess.high = Math.max(currentSess.high, c.high);
          currentSess.low = Math.min(currentSess.low, c.low);
          currentSess.endTime = c.time;
        }
      } else {
        if (currentSess) {
          sessionList.push({ ...currentSess });
          currentSess = null;
        }
      }
    }
    if (currentSess) {
      sessionList.push(currentSess);
    }

    // Capture the latest completed high/low of each session and trace sweep forward
    const seenNames = new Set<string>();
    const latestCandle = candles[candles.length - 1];

    for (let s = sessionList.length - 1; s >= 0; s--) {
      const sess = sessionList[s];
      // Only check recent completed sessions
      if (sess.endTime < latestCandle.time - 60) {
        if (!seenNames.has(sess.name)) {
          seenNames.add(sess.name);

          let hSwept = false;
          let hSweepTime = latestCandle.time;
          let hSweepPrice = sess.high;
          let lSwept = false;
          let lSweepTime = latestCandle.time;
          let lSweepPrice = sess.low;

          for (let i = 0; i < candles.length; i++) {
            const c = candles[i];
            if (c.time <= sess.endTime) continue;
            if (!hSwept && c.high > sess.high) {
              hSwept = true;
              hSweepTime = c.time;
              hSweepPrice = c.high;
            }
            if (!lSwept && c.low < sess.low) {
              lSwept = true;
              lSweepTime = c.time;
              lSweepPrice = c.low;
            }
            if (hSwept && lSwept) break;
          }

          if (!onlyShowWhenSwept || hSwept) {
            horizontalZones.push({
              id: `sess-h-${sess.name}-${sess.startTime}`,
              price: sess.high,
              label: hSwept ? `P-${sess.name} High [SWEPT]` : `P-${sess.name} High [UNSWEPT]`,
              color: sessionColor,
              time: sess.startTime,
              endTime: hSwept ? hSweepTime : (extendUntilPrice ? latestCandle.time : sess.endTime),
              category: 'SESSION_HL',
              isSwept: hSwept,
              sweepTime: hSwept ? hSweepTime : undefined,
              sweepPrice: hSwept ? hSweepPrice : undefined,
              originTime: sess.startTime,
              originPrice: sess.high,
              sweepExtremePrice: hSwept ? hSweepPrice : undefined,
              sweepDiff: hSwept ? Math.abs(hSweepPrice - sess.high) : undefined,
              sweepDirection: 'high_sweep',
            });
          }

          if (!onlyShowWhenSwept || lSwept) {
            horizontalZones.push({
              id: `sess-l-${sess.name}-${sess.startTime}`,
              price: sess.low,
              label: lSwept ? `P-${sess.name} Low [SWEPT]` : `P-${sess.name} Low [UNSWEPT]`,
              color: sessionColor,
              time: sess.startTime,
              endTime: lSwept ? lSweepTime : (extendUntilPrice ? latestCandle.time : sess.endTime),
              category: 'SESSION_HL',
              isSwept: lSwept,
              sweepTime: lSwept ? lSweepTime : undefined,
              sweepPrice: lSwept ? lSweepPrice : undefined,
              originTime: sess.startTime,
              originPrice: sess.low,
              sweepExtremePrice: lSwept ? lSweepPrice : undefined,
              sweepDiff: lSwept ? Math.abs(sess.low - lSweepPrice) : undefined,
              sweepDirection: 'low_sweep',
            });
          }
        }
      }
    }
  }

  // 3. EXTRACT SWING HIGHS & SWING LOWS FOR 3+ TOUCH DETECTION
  interface SwingPoint {
    index: number;
    time: number;
    price: number;
  }
  const swingHighs: SwingPoint[] = [];
  const swingLows: SwingPoint[] = [];
  const radius = 3;

  for (let i = radius; i < candles.length - radius; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - radius; j <= i + radius; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
    }
    if (isHigh) swingHighs.push({ index: i, time: candles[i].time, price: candles[i].high });
    if (isLow) swingLows.push({ index: i, time: candles[i].time, price: candles[i].low });
  }

  // 4. EQUAL HIGHS / LOWS (ONLY SHOW WITH 3+ TOUCHES)
  if (showThreeTouchEqualHL) {
    // Cluster swing highs
    const highClusters: { priceSum: number; count: number; points: SwingPoint[] }[] = [];
    for (const sh of swingHighs) {
      let matched = false;
      for (const cl of highClusters) {
        const avg = cl.priceSum / cl.count;
        if (Math.abs(sh.price - avg) / avg <= tolerance) {
          cl.priceSum += sh.price;
          cl.count += 1;
          cl.points.push(sh);
          matched = true;
          break;
        }
      }
      if (!matched) {
        highClusters.push({ priceSum: sh.price, count: 1, points: [sh] });
      }
    }

    // Only keep clusters with 3 or more touches!
    for (const cl of highClusters) {
      if (cl.count >= 3) {
        const avgPrice = cl.priceSum / cl.count;
        const firstTime = cl.points[0].time;
        const lastTouchTime = cl.points[cl.points.length - 1].time;

        let eqhSwept = false;
        let eqhSweepTime = latestCandle.time;
        let eqhSweepPrice = avgPrice;
        for (let i = 0; i < candles.length; i++) {
          const c = candles[i];
          if (c.time <= lastTouchTime) continue;
          if (c.high > avgPrice) {
            eqhSwept = true;
            eqhSweepTime = c.time;
            eqhSweepPrice = c.high;
            break;
          }
        }

        if (!onlyShowWhenSwept || eqhSwept) {
          horizontalZones.push({
            id: `eqh-3touch-${firstTime}-${Math.round(avgPrice)}`,
            price: avgPrice,
            label: eqhSwept ? `EQH [SWEPT]` : `EQH (${cl.count}x Touch)`,
            color: eqColor,
            time: firstTime,
            endTime: eqhSwept ? eqhSweepTime : (extendUntilPrice ? latestCandle.time : lastTouchTime),
            category: 'EQ_3TOUCH',
            touchesCount: cl.count,
            isSwept: eqhSwept,
            sweepTime: eqhSwept ? eqhSweepTime : undefined,
            sweepPrice: eqhSwept ? eqhSweepPrice : undefined,
            originTime: firstTime,
            originPrice: avgPrice,
            sweepExtremePrice: eqhSwept ? eqhSweepPrice : undefined,
            sweepDiff: eqhSwept ? Math.abs(eqhSweepPrice - avgPrice) : undefined,
            sweepDirection: 'high_sweep',
          });
        }
      }
    }

    // Cluster swing lows
    const lowClusters: { priceSum: number; count: number; points: SwingPoint[] }[] = [];
    for (const sl of swingLows) {
      let matched = false;
      for (const cl of lowClusters) {
        const avg = cl.priceSum / cl.count;
        if (Math.abs(sl.price - avg) / avg <= tolerance) {
          cl.priceSum += sl.price;
          cl.count += 1;
          cl.points.push(sl);
          matched = true;
          break;
        }
      }
      if (!matched) {
        lowClusters.push({ priceSum: sl.price, count: 1, points: [sl] });
      }
    }

    // Only keep clusters with 3 or more touches!
    for (const cl of lowClusters) {
      if (cl.count >= 3) {
        const avgPrice = cl.priceSum / cl.count;
        const firstTime = cl.points[0].time;
        const lastTouchTime = cl.points[cl.points.length - 1].time;

        let eqlSwept = false;
        let eqlSweepTime = latestCandle.time;
        let eqlSweepPrice = avgPrice;
        for (let i = 0; i < candles.length; i++) {
          const c = candles[i];
          if (c.time <= lastTouchTime) continue;
          if (c.low < avgPrice) {
            eqlSwept = true;
            eqlSweepTime = c.time;
            eqlSweepPrice = c.low;
            break;
          }
        }

        if (!onlyShowWhenSwept || eqlSwept) {
          horizontalZones.push({
            id: `eql-3touch-${firstTime}-${Math.round(avgPrice)}`,
            price: avgPrice,
            label: eqlSwept ? `EQL [SWEPT]` : `EQL (${cl.count}x Touch)`,
            color: eqColor,
            time: firstTime,
            endTime: eqlSwept ? eqlSweepTime : (extendUntilPrice ? latestCandle.time : lastTouchTime),
            category: 'EQ_3TOUCH',
            touchesCount: cl.count,
            isSwept: eqlSwept,
            sweepTime: eqlSwept ? eqlSweepTime : undefined,
            sweepPrice: eqlSwept ? eqlSweepPrice : undefined,
            originTime: firstTime,
            originPrice: avgPrice,
            sweepExtremePrice: eqlSwept ? eqlSweepPrice : undefined,
            sweepDiff: eqlSwept ? Math.abs(avgPrice - eqlSweepPrice) : undefined,
            sweepDirection: 'low_sweep',
          });
        }
      }
    }
  }

  // 5. TRENDLINE LIQUIDITY (3+ TOUCHES ONLY)
  if (showTrendlineLiquidity && candles.length > 20) {
    const latestCandle = candles[candles.length - 1];

    // Resistance Trendlines with 3+ touches
    const foundResistanceTrendlines: TrendlineLiquidityItem[] = [];
    for (let i = 0; i < swingHighs.length; i++) {
      for (let j = i + 1; j < swingHighs.length; j++) {
        const p1 = swingHighs[i];
        const p2 = swingHighs[j];
        if (p2.index - p1.index < 4) continue;
        const dt = p2.time - p1.time;
        if (dt <= 0) continue;
        const slope = (p2.price - p1.price) / dt;

        const touches: SwingPoint[] = [p1, p2];
        for (let k = j + 1; k < swingHighs.length; k++) {
          const p3 = swingHighs[k];
          const expectedPrice = p1.price + slope * (p3.time - p1.time);
          const relDiff = Math.abs(p3.price - expectedPrice) / p3.price;
          if (relDiff <= tolerance * 1.6) {
            touches.push(p3);
          }
        }

        if (touches.length >= 3) {
          const lastTouch = touches[touches.length - 1];
          let breached = false;
          for (let idx = p1.index; idx <= lastTouch.index; idx++) {
            const expPrice = p1.price + slope * (candles[idx].time - p1.time);
            if (candles[idx].close > expPrice * 1.002) {
              breached = true;
              break;
            }
          }
          if (!breached) {
            const isDuplicate = foundResistanceTrendlines.some(existing =>
              Math.abs(existing.startPrice - p1.price) / p1.price < 0.0015 &&
              Math.abs(existing.endPrice - lastTouch.price) / lastTouch.price < 0.0015
            );
            if (!isDuplicate) {
              const extendedEndPrice = p1.price + slope * (latestCandle.time - p1.time);
              foundResistanceTrendlines.push({
                id: `tl-res-${p1.time}-${touches.length}`,
                label: `TL Liquidity (${touches.length} Touches)`,
                color: trendlineColor,
                startTime: p1.time,
                startPrice: p1.price,
                endTime: latestCandle.time,
                endPrice: extendedEndPrice,
                touchesCount: touches.length,
                type: 'resistance',
              });
            }
          }
        }
      }
    }

    // Support Trendlines with 3+ touches
    const foundSupportTrendlines: TrendlineLiquidityItem[] = [];
    for (let i = 0; i < swingLows.length; i++) {
      for (let j = i + 1; j < swingLows.length; j++) {
        const p1 = swingLows[i];
        const p2 = swingLows[j];
        if (p2.index - p1.index < 4) continue;
        const dt = p2.time - p1.time;
        if (dt <= 0) continue;
        const slope = (p2.price - p1.price) / dt;

        const touches: SwingPoint[] = [p1, p2];
        for (let k = j + 1; k < swingLows.length; k++) {
          const p3 = swingLows[k];
          const expectedPrice = p1.price + slope * (p3.time - p1.time);
          const relDiff = Math.abs(p3.price - expectedPrice) / p3.price;
          if (relDiff <= tolerance * 1.6) {
            touches.push(p3);
          }
        }

        if (touches.length >= 3) {
          const lastTouch = touches[touches.length - 1];
          let breached = false;
          for (let idx = p1.index; idx <= lastTouch.index; idx++) {
            const expPrice = p1.price + slope * (candles[idx].time - p1.time);
            if (candles[idx].close < expPrice * 0.998) {
              breached = true;
              break;
            }
          }
          if (!breached) {
            const isDuplicate = foundSupportTrendlines.some(existing =>
              Math.abs(existing.startPrice - p1.price) / p1.price < 0.0015 &&
              Math.abs(existing.endPrice - lastTouch.price) / lastTouch.price < 0.0015
            );
            if (!isDuplicate) {
              const extendedEndPrice = p1.price + slope * (latestCandle.time - p1.time);
              foundSupportTrendlines.push({
                id: `tl-sup-${p1.time}-${touches.length}`,
                label: `TL Liquidity (${touches.length} Touches)`,
                color: trendlineColor,
                startTime: p1.time,
                startPrice: p1.price,
                endTime: latestCandle.time,
                endPrice: extendedEndPrice,
                touchesCount: touches.length,
                type: 'support',
              });
            }
          }
        }
      }
    }

    // Keep the top cleanest trendlines
    const allTLs = [...foundResistanceTrendlines, ...foundSupportTrendlines]
      .sort((a, b) => b.touchesCount - a.touchesCount)
      .slice(0, 4);

    trendlines.push(...allTLs);
  }

  return { horizontalZones, trendlines };
}

export function calculateVWAP(candles: CandleData[]): { time: number; value: number }[] {
  let cumulativePV = 0;
  let cumulativeV = 0;
  return candles.map(c => {
    const vol = c.volume ?? 0;
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativePV += typicalPrice * vol;
    cumulativeV += vol;
    return { time: c.time, value: cumulativeV === 0 ? c.close : cumulativePV / cumulativeV };
  });
}

export function calculateCumulativeDelta(candles: CandleData[]): { time: number; value: number }[] {
  let delta = 0;
  return candles.map(c => {
    const vol = c.volume ?? 0;
    // Simplified delta: close > open = buying, close < open = selling
    const volumeChange = c.close > c.open ? vol : -vol;
    delta += volumeChange;
    return { time: c.time, value: delta };
  });
}

export function calculateOrderFlowImbalance(candles: CandleData[]): { time: number; value: number; type: 'bullish' | 'bearish' }[] {
  return candles
    .filter(c => Math.abs(c.close - c.open) / c.open > 0.001)
    .map(c => ({ 
      time: c.time, 
      value: c.close, 
      type: c.close > c.open ? 'bullish' : 'bearish' 
    }));
}

export function calculateTPOProfile(candles: CandleData[]): { price: number; time: number }[] {
  // Simple TPO: return price levels touched
  return candles.map(c => ({ price: c.close, time: c.time }));
}

export function calculateForceIndex(candles: CandleData[]): { time: number; value: number }[] {
  return candles.slice(1).map((c, i) => {
    const vol = c.volume ?? 0;
    return { 
      time: c.time, 
      value: (c.close - candles[i].close) * vol 
    };
  });
}

export function calculateMFI(candles: CandleData[]): { time: number; value: number }[] {
  const result: { time: number; value: number }[] = [];
  for (let i = 14; i < candles.length; i++) {
    let positiveFlow = 0;
    let negativeFlow = 0;
    for (let j = i - 13; j <= i; j++) {
      const prevCandle = candles[j-1];
      const prevClose = prevCandle ? prevCandle.close : 0;
      const vol = candles[j].volume ?? 0;
      const typicalPrice = (candles[j].high + candles[j].low + candles[j].close) / 3;
      const moneyFlow = typicalPrice * vol;
      if (typicalPrice > prevClose) positiveFlow += moneyFlow;
      else negativeFlow += moneyFlow;
    }
    const ratio = negativeFlow === 0 ? 100 : positiveFlow / negativeFlow;
    result.push({ time: candles[i].time, value: 100 - (100 / (1 + ratio)) });
  }
  return result;
}

export function calculateOBV(candles: CandleData[]): { time: number; value: number }[] {
  let obv = 0;
  return candles.map((c, idx) => {
    const vol = c.volume ?? 0;
    const prevCandle = idx > 0 ? candles[idx - 1] : null;
    if (prevCandle && c.close > prevCandle.close) obv += vol;
    else if (prevCandle && c.close < prevCandle.close) obv -= vol;
    return { time: c.time, value: obv };
  });
}

function hexToRgba(hex: string, alpha: number): string {
  let c = (hex || '#2962FF').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return `rgba(${num >> 16}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

export function calculateVolumaticORB(
  candles: CandleData[],
  startTimeStr: string = '06:30',
  endTimeStr: string = '06:45',
  utcOffset: number = 5,
  rangeColor: string = '#E040FB',
  bullishBreakColor: string = '#00FF68',
  bearishBreakColor: string = '#FF0008',
  opacity: number = 0.08
): VolumaticORBItem[] {
  const items: VolumaticORBItem[] = [];
  if (!candles || candles.length === 0) return items;

  const [startH, startM] = startTimeStr.split(':').map(Number);
  const [endH, endM] = endTimeStr.split(':').map(Number);
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  const dayMap = new Map<string, CandleData[]>();
  for (const c of candles) {
    const date = new Date(c.time * 1000);
    const adjMs = date.getTime() + utcOffset * 3600 * 1000;
    const adjDate = new Date(adjMs);
    const key = `${adjDate.getUTCFullYear()}-${String(adjDate.getUTCMonth() + 1).padStart(2, '0')}-${String(adjDate.getUTCDate()).padStart(2, '0')}`;
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(c);
  }

  dayMap.forEach((dayCandles, dateStr) => {
    const orbCandles: CandleData[] = [];

    for (const c of dayCandles) {
      const date = new Date(c.time * 1000);
      const adjMs = date.getTime() + utcOffset * 3600 * 1000;
      const adjDate = new Date(adjMs);
      const mins = adjDate.getUTCHours() * 60 + adjDate.getUTCMinutes();

      if (mins >= startMins && mins < endMins) {
        orbCandles.push(c);
      }
    }

    if (orbCandles.length > 0) {
      orbCandles.sort((a, b) => a.time - b.time);

      const startTime = orbCandles[0].time;
      const endTime = orbCandles[orbCandles.length - 1].time;

      const high = Math.max(...orbCandles.map(c => c.high));
      const low = Math.min(...orbCandles.map(c => c.low));

      let isBrokenUp = false;
      let isBrokenDown = false;
      let breakoutUpTime: number | undefined;
      let breakoutDownTime: number | undefined;

      // Find the candle corresponding to 8:00 PM (1200 mins) to terminate the box and breakout check
      let endOfDayTime = dayCandles[dayCandles.length - 1].time;
      const targetEndMins = 20 * 60; // 8:00 PM is 1200 mins

      for (const c of dayCandles) {
        const date = new Date(c.time * 1000);
        const adjMs = date.getTime() + utcOffset * 3600 * 1000;
        const adjDate = new Date(adjMs);
        const mins = adjDate.getUTCHours() * 60 + adjDate.getUTCMinutes();
        if (mins <= targetEndMins) {
          endOfDayTime = c.time;
        }
      }

      for (const c of dayCandles) {
        if (c.time <= endTime) continue;
        if (c.time > endOfDayTime) continue; // Only check breakout within the 8:00 PM boundary

        if (!isBrokenUp && c.close > high) {
          isBrokenUp = true;
          breakoutUpTime = c.time;
        }
        if (!isBrokenDown && c.close < low) {
          isBrokenDown = true;
          breakoutDownTime = c.time;
        }
      }

      items.push({
        id: `orb-${startTime}`,
        dateStr,
        startTime,
        endTime,
        high,
        low,
        color: hexToRgba(rangeColor, opacity),
        borderColor: rangeColor,
        isBrokenUp,
        isBrokenDown,
        breakoutUpTime,
        breakoutDownTime,
        endOfDayTime,
      });
    }
  });

  return items;
}
