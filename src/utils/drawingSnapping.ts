import { CandleData } from '../types/chart';
import { DrawingItem, DrawingPoint, MagnetMode } from '../types/drawings';
import { IChartApi, ISeriesApi } from 'lightweight-charts';

export interface SnapResult {
  price: number;
  time: number;
  snapped: boolean;
  snapType?: 'ohlc_high' | 'ohlc_low' | 'ohlc_open' | 'ohlc_close' | 'indicator' | 'drawing_endpoint' | 'time_grid';
  label?: string;
}

export function findSnapCoordinate({
  rawPrice,
  rawTime,
  candles,
  drawings,
  indicatorValues,
  magnetMode,
  chart,
  series,
}: {
  rawPrice: number;
  rawTime: number;
  candles: CandleData[];
  drawings?: DrawingItem[];
  indicatorValues?: { name: string; value: number }[];
  magnetMode: MagnetMode;
  chart?: IChartApi | null;
  series?: ISeriesApi<any> | null;
}): SnapResult {
  // 1. If magnet is completely off and no other snap is active, return raw
  if (magnetMode === 'off' && (!drawings || drawings.length === 0)) {
    return { price: rawPrice, time: rawTime, snapped: false };
  }

  // Find nearest candle by time
  if (!candles || candles.length === 0) {
    return { price: rawPrice, time: rawTime, snapped: false };
  }

  // Binary search or linear search for closest candle
  let closestCandle = candles[0];
  let minTimeDiff = Math.abs(candles[0].time - rawTime);
  for (let i = 1; i < candles.length; i++) {
    const diff = Math.abs(candles[i].time - rawTime);
    if (diff < minTimeDiff) {
      minTimeDiff = diff;
      closestCandle = candles[i];
    }
  }

  // Check endpoint-to-endpoint snap with existing drawings (highest priority)
  if (drawings && drawings.length > 0) {
    for (const d of drawings) {
      for (const p of d.points) {
        const timeDiff = Math.abs(p.time - rawTime);
        const pricePctDiff = Math.abs(p.price - rawPrice) / (rawPrice || 1);
        if (timeDiff < 3600 * 2 && pricePctDiff < 0.008) {
          return {
            price: p.price,
            time: p.time,
            snapped: true,
            snapType: 'drawing_endpoint',
            label: 'Snap: Vertex Point',
          };
        }
      }
    }
  }

  // Check indicator values snap
  if (indicatorValues && indicatorValues.length > 0) {
    for (const ind of indicatorValues) {
      const pricePctDiff = Math.abs(ind.value - rawPrice) / (rawPrice || 1);
      if (pricePctDiff < 0.006) {
        return {
          price: ind.value,
          time: closestCandle.time,
          snapped: true,
          snapType: 'indicator',
          label: `Snap: ${ind.name} (${ind.value.toFixed(2)})`,
        };
      }
    }
  }

  // Magnet to Candle OHLC
  if (magnetMode === 'strong') {
    // Pick closest of O, H, L, C
    const candidates = [
      { price: closestCandle.high, type: 'ohlc_high' as const, label: 'High' },
      { price: closestCandle.low, type: 'ohlc_low' as const, label: 'Low' },
      { price: closestCandle.open, type: 'ohlc_open' as const, label: 'Open' },
      { price: closestCandle.close, type: 'ohlc_close' as const, label: 'Close' },
    ];
    let best = candidates[0];
    let minPriceDiff = Math.abs(candidates[0].price - rawPrice);
    for (const c of candidates) {
      const diff = Math.abs(c.price - rawPrice);
      if (diff < minPriceDiff) {
        minPriceDiff = diff;
        best = c;
      }
    }

    return {
      price: best.price,
      time: closestCandle.time,
      snapped: true,
      snapType: best.type,
      label: `Magnet: ${best.label} ${best.price.toFixed(2)}`,
    };
  } else if (magnetMode === 'weak') {
    // Soft pull: only snap if price is close enough
    const candidates = [
      { price: closestCandle.high, type: 'ohlc_high' as const, label: 'High' },
      { price: closestCandle.low, type: 'ohlc_low' as const, label: 'Low' },
      { price: closestCandle.open, type: 'ohlc_open' as const, label: 'Open' },
      { price: closestCandle.close, type: 'ohlc_close' as const, label: 'Close' },
    ];
    let best = candidates[0];
    let minPriceDiff = Math.abs(candidates[0].price - rawPrice);
    for (const c of candidates) {
      const diff = Math.abs(c.price - rawPrice);
      if (diff < minPriceDiff) {
        minPriceDiff = diff;
        best = c;
      }
    }

    const pctDiff = minPriceDiff / (rawPrice || 1);
    // If within 0.75% of candle range or price, pull softly
    if (pctDiff < 0.0075) {
      return {
        price: best.price,
        time: closestCandle.time,
        snapped: true,
        snapType: best.type,
        label: `Soft Magnet: ${best.label}`,
      };
    }
  }

  return { price: rawPrice, time: rawTime, snapped: false };
}
