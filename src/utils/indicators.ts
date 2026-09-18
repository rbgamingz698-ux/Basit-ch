/**
 * Technical Indicator Calculations
 */

import { CandleData } from '../types/chart';

export interface LinePoint {
  time: number;
  value: number;
}

export function calculateEMA(candles: CandleData[], period: number): LinePoint[] {
  if (!candles || candles.length < period) return [];

  const k = 2 / (period + 1);
  const result: LinePoint[] = [];

  // Simple average for initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let currentEma = sum / period;
  if (Number.isFinite(currentEma)) {
    result.push({ time: candles[period - 1].time, value: Number(currentEma.toFixed(4)) });
  }

  for (let i = period; i < candles.length; i++) {
    currentEma = candles[i].close * k + currentEma * (1 - k);
    if (Number.isFinite(currentEma)) {
      result.push({ time: candles[i].time, value: Number(currentEma.toFixed(4)) });
    }
  }

  return result;
}

export function calculateBollingerBands(
  candles: CandleData[], 
  period: number = 20, 
  stdDevMultiplier: number = 2
): { upper: LinePoint[]; middle: LinePoint[]; lower: LinePoint[] } {
  if (!candles || candles.length < period) return { upper: [], middle: [], lower: [] };

  const upper: LinePoint[] = [];
  const middle: LinePoint[] = [];
  const lower: LinePoint[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, c) => acc + c.close, 0);
    const mean = sum / period;

    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(Math.max(0, variance));

    const upVal = mean + stdDevMultiplier * stdDev;
    const lowVal = mean - stdDevMultiplier * stdDev;

    if (Number.isFinite(upVal) && Number.isFinite(mean) && Number.isFinite(lowVal)) {
      upper.push({ time: candles[i].time, value: Number(upVal.toFixed(4)) });
      middle.push({ time: candles[i].time, value: Number(mean.toFixed(4)) });
      lower.push({ time: candles[i].time, value: Number(lowVal.toFixed(4)) });
    }
  }

  return { upper, middle, lower };
}

export function calculateRSI(candles: CandleData[], period: number = 14): LinePoint[] {
  if (candles.length <= period) return [];

  const result: LinePoint[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - 100 / (1 + rs);

  result.push({ time: candles[period].time, value: Number(rsi.toFixed(2)) });

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);

    result.push({ time: candles[i].time, value: Number(rsi.toFixed(2)) });
  }

  return result;
}
