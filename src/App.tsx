import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  BarChart2, 
  Crosshair, 
  Eraser, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ChevronRight, 
  ChevronDown, 
  X, 
  Layers, 
  HelpCircle, 
  Activity, 
  BookOpen, 
  Monitor, 
  ArrowUpRight, 
  Info,
  LineChart
} from 'lucide-react';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VPBin {
  low: number;
  high: number;
  mid: number;
  vol: number;
  width: number;
  bullishVol: number;
  bearishVol: number;
}

export interface VolumeProfileResult {
  bins: VPBin[];
  poc: number;
  vah: number;
  val: number;
  maxVol: number;
  totalVol: number;
  hvn: number[];
  lvn: number[];
  low: number;
  high: number;
  count: number;
  avgVolume: number;
}

export interface ManualVP {
  id: string;
  priceStart: number;
  priceEnd: number;
  timeStart: number;
  timeEnd: number;
  vp: VolumeProfileResult;
  xPosition: number;
}

export interface SessionVP {
  id: string;
  type: 'morning' | 'evening';
  timeStart: number;
  timeEnd: number;
  vp: VolumeProfileResult;
}

export interface Asset {
  symbol: string;
  name: string;
  basePrice: number;
  decimals: number;
  tickSize: number;
}

const ASSETS: Asset[] = [
  { symbol: 'GC=F', name: 'Gold Futures (Comex)', basePrice: 2580, decimals: 1, tickSize: 0.1 },
  { symbol: 'NQ=F', name: 'NASDAQ 100 Futures', basePrice: 19850, decimals: 0, tickSize: 0.25 },
  { symbol: 'YM=F', name: 'Dow Jones Mini Futures', basePrice: 41800, decimals: 0, tickSize: 1.0 },
];

export function buildFixedRangeVP(
  allCandles: Candle[],
  priceStart: number,
  priceEnd: number,
  timeStart: number,
  timeEnd: number,
  bins: number = 24
): VolumeProfileResult | null {
  const pLow = Math.min(priceStart, priceEnd);
  const pHigh = Math.max(priceStart, priceEnd);
  const tLow = Math.min(timeStart, timeEnd);
  const tHigh = Math.max(timeStart, timeEnd);

  const filtered = allCandles.filter(c => 
    c.time >= tLow && 
    c.time <= tHigh && 
    c.high >= pLow && 
    c.low <= pHigh
  );

  if (filtered.length === 0) return null;

  const Low = pLow;
  const High = pHigh;
  const rangeDiff = High - Low;
  if (rangeDiff <= 0) return null;

  const BinSize = rangeDiff / bins;

  const binsArr: VPBin[] = Array.from({ length: bins }, (_, k) => ({
    low: Low + k * BinSize,
    high: Low + (k + 1) * BinSize,
    mid: Low + k * BinSize + BinSize / 2,
    vol: 0,
    width: 0,
    bullishVol: 0,
    bearishVol: 0
  }));

  filtered.forEach(c => {
    const isBullish = c.close >= c.open;
    const candleVol = c.volume || 1;
    const closeBinIdx = Math.floor((c.close - Low) / BinSize);
    if (closeBinIdx >= 0 && closeBinIdx < bins) {
      binsArr[closeBinIdx].vol += candleVol * 0.7;
      if (isBullish) {
        binsArr[closeBinIdx].bullishVol += candleVol * 0.7;
      } else {
        binsArr[closeBinIdx].bearishVol += candleVol * 0.7;
      }
    }

    const hlRange = c.high - c.low;
    if (hlRange > 0) {
      const share = candleVol * 0.3;
      binsArr.forEach(b => {
        const overlap = Math.max(0, Math.min(b.high, c.high) - Math.max(b.low, c.low));
        if (overlap > 0) {
          const ratio = overlap / hlRange;
          const assignedVol = share * ratio;
          b.vol += assignedVol;
          if (isBullish) {
            b.bullishVol += assignedVol;
          } else {
            b.bearishVol += assignedVol;
          }
        }
      });
    }
  });

  let pocIdx = 0;
  let maxVol = 0.0001;
  binsArr.forEach((b, idx) => {
    if (b.vol > maxVol) {
      maxVol = b.vol;
      pocIdx = idx;
    }
  });
  const POC = binsArr[pocIdx].mid;

  const totalVol = binsArr.reduce((sum, b) => sum + b.vol, 0);
  const targetVol = totalVol * 0.70;

  let top = pocIdx;
  let bot = pocIdx;
  let currentAccumulatedVol = binsArr[pocIdx].vol;

  while (currentAccumulatedVol < targetVol && (top < bins - 1 || bot > 0)) {
    const upVol = top < bins - 1 ? binsArr[top + 1].vol : 0;
    const downVol = bot > 0 ? binsArr[bot - 1].vol : 0;

    if (upVol >= downVol && top < bins - 1) {
      top++;
      currentAccumulatedVol += upVol;
    } else if (bot > 0) {
      bot--;
      currentAccumulatedVol += downVol;
    } else if (top < bins - 1) {
      top++;
      currentAccumulatedVol += upVol;
    } else {
      break;
    }
  }

  const VAH = binsArr[top].mid;
  const VAL = binsArr[bot].mid;

  const hvnThreshold = maxVol * 0.75;
  const lvnThreshold = maxVol * 0.18;
  const hvn: number[] = [];
  const lvn: number[] = [];

  binsArr.forEach(b => {
    if (b.vol >= hvnThreshold) {
      hvn.push(b.mid);
    } else if (b.vol <= lvnThreshold && b.vol > 0) {
      lvn.push(b.mid);
    }
  });

  binsArr.forEach(b => {
    b.width = (b.vol / maxVol) * 100;
  });

  return {
    bins: binsArr,
    poc: POC,
    vah: VAH,
    val: VAL,
    maxVol,
    totalVol,
    hvn,
    lvn,
    low: Low,
    high: High,
    count: filtered.length,
    avgVolume: totalVol / (filtered.length || 1),
  };
}

export function generateSyntheticHistory(
  symbol: string,
  timeframe: string,
  count: number = 1000
): Candle[] {
  const asset = ASSETS.find(a => a.symbol === symbol) || ASSETS[0];
  const candles: Candle[] = [];

  let spacing = 300;
  if (timeframe === '1m') spacing = 60;
  if (timeframe === '5m') spacing = 300;
  if (timeframe === '15m') spacing = 900;
  if (timeframe === '1H') spacing = 3600;
  if (timeframe === '4H') spacing = 14400;

  let currentPrice = asset.basePrice;
  let currentTimestamp = Math.floor(Date.now() / 1000) - count * spacing;

  let seed = symbol.charCodeAt(0) + symbol.charCodeAt(1) + timeframe.charCodeAt(0);
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const supportZone = asset.basePrice * 0.985;
  const resistanceZone = asset.basePrice * 1.015;

  for (let i = 0; i < count; i++) {
    currentTimestamp += spacing;

    const pktHour = (Math.floor(currentTimestamp / 3600) + 5) % 24;

    const isMorningSession = pktHour >= 6 && pktHour < 12;
    const isEveningSession = pktHour >= 18 && pktHour < 22;

    let volatility = 0.0012;
    let directionalBias = 0.00002;

    if (isMorningSession) {
      volatility = 0.0020;
      directionalBias += 0.0001;
    } else if (isEveningSession) {
      volatility = 0.0035;
      directionalBias -= 0.00005;
    }

    if (currentPrice < supportZone) {
      directionalBias += 0.0005;
    } else if (currentPrice > resistanceZone) {
      directionalBias -= 0.0005;
    }

    const percentChange = (random() - 0.49) * 2 * volatility + directionalBias;
    const open = currentPrice;
    const close = currentPrice * (1 + percentChange);

    const wickHigh = Math.max(open, close) * (1 + random() * volatility * 0.4);
    const wickLow = Math.min(open, close) * (1 - random() * volatility * 0.4);

    const high = Math.max(wickHigh, open, close);
    const low = Math.min(wickLow, open, close);

    let baseVol = isEveningSession ? 1800 : isMorningSession ? 1200 : 350;
    const volume = Math.floor(baseVol * (0.4 + random() * 1.6) * (1 + Math.abs(percentChange) * 100));

    candles.push({
      time: currentTimestamp,
      open: Number(open.toFixed(asset.decimals)),
      high: Number(high.toFixed(asset.decimals)),
      low: Number(low.toFixed(asset.decimals)),
      close: Number(close.toFixed(asset.decimals)),
      volume: volume
    });

    currentPrice = close;
  }

  return candles;
}

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('GC=F');
  const [timeframe, setTimeframe] = useState<string>('5m');
  const [binsCount, setBinsCount] = useState<number>(24);
  const [showSessions, setShowSessions] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<'crosshair' | 'fixedVP' | 'eraser'>('crosshair');

  const [candles, setCandles] = useState<Candle[]>([]);
  const [manualVPs, setManualVPs] = useState<ManualVP[]>([]);
  const [selectedVP, setSelectedVP] = useState<ManualVP | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 100 });
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; price: number; time: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number; price: number; time: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number; price: number; time: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeAsset = useMemo(() => {
    return ASSETS.find(a => a.symbol === selectedSymbol) || ASSETS[0];
  }, [selectedSymbol]);

  useEffect(() => {
    const data = generateSyntheticHistory(selectedSymbol, timeframe, 2000);
    setCandles(data);

    if (data.length > 0) {
      const last100 = data.slice(-100);
      const minPrice = Math.min(...last100.map(c => c.low));
      const maxPrice = Math.max(...last100.map(c => c.high));
      const padding = (maxPrice - minPrice) * 0.15 || 10;
      setPriceRange({
        min: minPrice - padding,
        max: maxPrice + padding
      });
    }

    try {
      const saved = localStorage.getItem(`manualVPs_${selectedSymbol}`);
      if (saved) {
        setManualVPs(JSON.parse(saved));
      } else {
        setManualVPs([]);
      }
    } catch {
      setManualVPs([]);
    }

    setSelectedVP(null);
  }, [selectedSymbol, timeframe]);

  const saveVPs = (vps: ManualVP[]) => {
    setManualVPs(vps);
    try {
      localStorage.setItem(`manualVPs_${selectedSymbol}`, JSON.stringify(vps));
    } catch (err) {
      console.error('Failed to save manual VPs:', err);
    }
  };

  const handleClearAllVPs = () => {
    saveVPs([]);
    setSelectedVP(null);
  };

  const RIGHT_AXIS_WIDTH = 75;
  const BOTTOM_AXIS_HEIGHT = 30;

  const getCanvasDimensions = () => {
    if (!canvasRef.current) return { width: 800, height: 500, chartWidth: 725, chartHeight: 470 };
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    return {
      width,
      height,
      chartWidth: width - RIGHT_AXIS_WIDTH,
      chartHeight: height - BOTTOM_AXIS_HEIGHT
    };
  };

  const priceToPixel = useCallback((price: number): number => {
    const { chartHeight } = getCanvasDimensions();
    const ratio = (price - priceRange.min) / (priceRange.max - priceRange.min || 1);
    return chartHeight * (1 - ratio);
  }, [priceRange]);

  const pixelToPrice = useCallback((y: number): number => {
    const { chartHeight } = getCanvasDimensions();
    const ratio = 1 - (y / chartHeight);
    return priceRange.min + ratio * (priceRange.max - priceRange.min);
  }, [priceRange]);

  const timeToPixel = useCallback((time: number): number => {
    const { chartWidth } = getCanvasDimensions();
    if (candles.length === 0) return 0;
    const lastCandle = candles[candles.length - 1];
    const secondsFromLast = lastCandle.time - time;
    const pixelDistance = secondsFromLast * zoomLevel;
    return chartWidth - scrollOffset - pixelDistance;
  }, [candles, zoomLevel, scrollOffset]);

  const pixelToTime = useCallback((x: number): number => {
    const { chartWidth } = getCanvasDimensions();
    if (candles.length === 0) return Date.now() / 1000;

    const lastCandle = candles[candles.length - 1];
    const pixelFromRight = chartWidth - scrollOffset - x;
    const secondsFromLast = pixelFromRight / zoomLevel;
    return lastCandle.time - secondsFromLast;
  }, [candles, zoomLevel, scrollOffset]);

  const sessionsList = useMemo((): SessionVP[] => {
    if (candles.length === 0 || !showSessions) return [];

    const computed: SessionVP[] = [];
    let currentSession: { type: 'morning' | 'evening'; startIdx: number; lastCandleTime: number } | null = null;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const date = new Date(c.time * 1000);
      const utcHour = date.getUTCHours();
      const utcMinute = date.getUTCMinutes();
      const pktHour = (utcHour + 5) % 24;
      const pktMinute = utcMinute;

      let type: 'morning' | 'evening' | null = null;
      if (pktHour >= 6 && pktHour < 12) {
        type = 'morning';
      } else if ((pktHour === 18 && pktMinute >= 30) || (pktHour > 18 && pktHour < 22)) {
        type = 'evening';
      }

      if (type) {
        if (!currentSession || currentSession.type !== type || (c.time - currentSession.lastCandleTime > 14400)) {
          if (currentSession) {
            const startCandle = candles[currentSession.startIdx];
            const endCandle = candles[i - 1];
            if (endCandle) {
              const subCandles = candles.slice(currentSession.startIdx, i);
              const lowPrices = subCandles.map(sc => sc.low);
              const highPrices = subCandles.map(sc => sc.high);
              const pMin = Math.min(...lowPrices);
              const pMax = Math.max(...highPrices);
              const vp = buildFixedRangeVP(candles, pMin, pMax, startCandle.time, endCandle.time, binsCount);
              if (vp) {
                computed.push({
                  id: `session-${startCandle.time}-${type}`,
                  type: currentSession.type,
                  timeStart: startCandle.time,
                  timeEnd: endCandle.time,
                  vp
                });
              }
            }
          }
          currentSession = { type, startIdx: i, lastCandleTime: c.time };
        } else {
          currentSession.lastCandleTime = c.time;
        }
      } else {
        if (currentSession) {
          const startCandle = candles[currentSession.startIdx];
          const endCandle = candles[i - 1];
          if (endCandle) {
            const subCandles = candles.slice(currentSession.startIdx, i);
            const lowPrices = subCandles.map(sc => sc.low);
            const highPrices = subCandles.map(sc => sc.high);
            const pMin = Math.min(...lowPrices);
            const pMax = Math.max(...highPrices);
            const vp = buildFixedRangeVP(candles, pMin, pMax, startCandle.time, endCandle.time, binsCount);
            if (vp) {
              computed.push({
                id: `session-${startCandle.time}-${currentSession.type}`,
                type: currentSession.type,
                timeStart: startCandle.time,
                timeEnd: endCandle.time,
                vp
              });
            }
          }
          currentSession = null;
        }
      }
    }

    if (currentSession) {
      const startCandle = candles[currentSession.startIdx];
      const endCandle = candles[candles.length - 1];
      if (startCandle && endCandle) {
        const subCandles = candles.slice(currentSession.startIdx);
        const lowPrices = subCandles.map(sc => sc.low);
        const highPrices = subCandles.map(sc => sc.high);
        const pMin = Math.min(...lowPrices);
        const pMax = Math.max(...highPrices);
        const vp = buildFixedRangeVP(candles, pMin, pMax, startCandle.time, endCandle.time, binsCount);
        if (vp) {
          computed.push({
            id: `session-${startCandle.time}-${currentSession.type}`,
            type: currentSession.type,
            timeStart: startCandle.time,
            timeEnd: endCandle.time,
            vp
          });
        }
      }
    }

    return computed;
  }, [candles, showSessions, binsCount]);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, chartWidth, chartHeight } = getCanvasDimensions();

    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, width, height);

    if (showSessions) {
      sessionsList.forEach(session => {
        const x1 = timeToPixel(session.timeStart);
        const x2 = timeToPixel(session.timeEnd);
        if (x2 < 0 || x1 > chartWidth) return;

        ctx.fillStyle = session.type === 'morning' ? 'rgba(255, 152, 0, 0.05)' : 'rgba(33, 150, 243, 0.04)';
        ctx.fillRect(Math.max(0, x1), 0, Math.min(chartWidth, x2) - Math.max(0, x1), chartHeight);

        ctx.fillStyle = session.type === 'morning' ? '#ff9800' : '#2196f3';
        ctx.font = '10px monospace';
        ctx.fillText(
          session.type === 'morning' ? 'PKT MORNING' : 'PKT EVENING',
          Math.max(4, x1 + 4),
          20
        );
      });
    }

    ctx.strokeStyle = '#2a2e39';
    ctx.lineWidth = 1;

    const priceStep = (priceRange.max - priceRange.min) / 10;
    for (let i = 0; i <= 10; i++) {
      const price = priceRange.min + i * priceStep;
      const y = priceToPixel(price);
      if (y >= 0 && y <= chartHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();

        ctx.fillStyle = '#9fb3c8';
        ctx.font = '10px sans-serif';
        ctx.fillText(price.toFixed(activeAsset.decimals), chartWidth + 5, y + 4);
      }
    }

    if (candles.length > 0) {
      const gridCount = 8;
      const totalCandleSecs = candles[candles.length - 1].time - candles[0].time;
      const timeStep = totalCandleSecs / gridCount;
      for (let i = 0; i <= gridCount; i++) {
        const targetTime = candles[0].time + i * timeStep;
        const x = timeToPixel(targetTime);
        if (x >= 0 && x <= chartWidth) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, chartHeight);
          ctx.stroke();

          const d = new Date(targetTime * 1000);
          const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
          const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
          ctx.fillStyle = '#829ab1';
          ctx.font = '10px monospace';
          ctx.fillText(dateStr + ' ' + timeStr, x - 25, chartHeight + 18);
        }
      }
    }

    const candleWidth = Math.max(1.5, zoomLevel * (timeframe === '1m' ? 45 : timeframe === '5m' ? 220 : 600));

    candles.forEach(c => {
      const x = timeToPixel(c.time);
      if (x + candleWidth < 0 || x - candleWidth > chartWidth) return;

      const yOpen = priceToPixel(c.open);
      const yClose = priceToPixel(c.close);
      const yHigh = priceToPixel(c.high);
      const yLow = priceToPixel(c.low);

      const isBullish = c.close >= c.open;
      const themeColor = isBullish ? '#26a69a' : '#ef5350';

      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      ctx.fillStyle = themeColor;
      const rectX = x - candleWidth / 2;
      const rectY = Math.min(yOpen, yClose);
      const rectW = Math.max(1.2, candleWidth);
      const rectH = Math.max(1, Math.abs(yOpen - yClose));
      ctx.fillRect(rectX, rectY, rectW, rectH);
    });

    if (showSessions) {
      sessionsList.forEach(session => {
        const xStart = timeToPixel(session.timeStart);
        const xEnd = timeToPixel(session.timeEnd);
        if (xEnd < 0 || xStart > chartWidth) return;

        const maxDrawWidth = Math.min(100, xEnd - xStart);
        const binHeight = Math.abs(priceToPixel(session.vp.bins[0].high) - priceToPixel(session.vp.bins[0].low));

        session.vp.bins.forEach(b => {
          const yTop = priceToPixel(b.high);
          const drawW = (b.vol / session.vp.maxVol) * maxDrawWidth;
          ctx.fillStyle = 'rgba(255, 193, 7, 0.25)';
          ctx.fillRect(xEnd - drawW, yTop, drawW, binHeight - 0.5);
        });

        const yPoc = priceToPixel(session.vp.poc);
        ctx.strokeStyle = 'rgba(239, 83, 80, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xStart, yPoc);
        ctx.lineTo(xEnd, yPoc);
        ctx.stroke();

        const yVah = priceToPixel(session.vp.vah);
        const yVal = priceToPixel(session.vp.val);
        ctx.strokeStyle = 'rgba(255, 193, 7, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(xStart, yVah);
        ctx.lineTo(xEnd, yVah);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(xStart, yVal);
        ctx.lineTo(xEnd, yVal);
        ctx.stroke();

        ctx.setLineDash([]);
      });
    }

    manualVPs.forEach(vp => {
      const xStart = timeToPixel(vp.timeStart);
      const xEnd = timeToPixel(vp.timeEnd);
      const pLow = Math.min(vp.priceStart, vp.priceEnd);
      const pHigh = Math.max(vp.priceStart, vp.priceEnd);

      const yTopBox = priceToPixel(pHigh);
      const yBotBox = priceToPixel(pLow);

      const isSelected = selectedVP?.id === vp.id;

      ctx.strokeStyle = isSelected ? '#2962FF' : 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(xStart, yTopBox, xEnd - xStart, yBotBox - yTopBox);
      ctx.setLineDash([]);

      const maxDrawWidth = 140;
      const binPixelHeight = Math.abs(priceToPixel(vp.vp.bins[0].high) - priceToPixel(vp.vp.bins[0].low));

      vp.vp.bins.forEach(b => {
        const yTop = priceToPixel(b.high);
        const drawW = (b.vol / vp.vp.maxVol) * maxDrawWidth;
        const bullRatio = b.vol > 0 ? b.bullishVol / b.vol : 0.5;
        const bullW = drawW * bullRatio;
        const bearW = drawW - bullW;
        const isInValueArea = b.mid >= vp.vp.val && b.mid <= vp.vp.vah;
        const opacityBull = isInValueArea ? (isSelected ? '0.65' : '0.45') : '0.22';
        const opacityBear = isInValueArea ? (isSelected ? '0.65' : '0.45') : '0.22';

        ctx.fillStyle = `rgba(38, 166, 154, ${opacityBull})`;
        ctx.fillRect(xEnd - drawW, yTop, bullW, binPixelHeight - 0.5);

        ctx.fillStyle = `rgba(239, 83, 80, ${opacityBear})`;
        ctx.fillRect(xEnd - drawW + bullW, yTop, bearW, binPixelHeight - 0.5);
      });

      const yPoc = priceToPixel(vp.vp.poc);
      ctx.strokeStyle = '#ef5350';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(xStart, yPoc);
      ctx.lineTo(xEnd, yPoc);
      ctx.stroke();

      const yVah = priceToPixel(vp.vp.vah);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(xStart, yVah);
      ctx.lineTo(xEnd, yVah);
      ctx.stroke();

      const yVal = priceToPixel(vp.vp.val);
      ctx.beginPath();
      ctx.moveTo(xStart, yVal);
      ctx.lineTo(xEnd, yVal);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`FRVP #${vp.id.substring(vp.id.length - 4)}`, xStart + 5, yTopBox + 15);
    });

    if (isDrawing && drawStart && drawEnd) {
      ctx.strokeStyle = '#2962FF';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(41, 98, 255, 0.08)';
      ctx.setLineDash([6, 4]);

      const startX = drawStart.x;
      const startY = drawStart.y;
      const curX = drawEnd.x;
      const curY = drawEnd.y;

      ctx.fillRect(startX, startY, curX - startX, curY - startY);
      ctx.strokeRect(startX, startY, curX - startX, curY - startY);
      ctx.setLineDash([]);
    }

    if (crosshair && activeTool === 'crosshair') {
      ctx.strokeStyle = '#85929E';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(crosshair.x, 0);
      ctx.lineTo(crosshair.x, chartHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, crosshair.y);
      ctx.lineTo(chartWidth, crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#2a2e39';
      ctx.fillRect(chartWidth + 1, crosshair.y - 10, RIGHT_AXIS_WIDTH, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText(crosshair.price.toFixed(activeAsset.decimals), chartWidth + 6, crosshair.y + 4);

      const d = new Date(crosshair.time * 1000);
      const text = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      ctx.fillStyle = '#2a2e39';
      ctx.fillRect(crosshair.x - 50, chartHeight + 1, 100, 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, crosshair.x - 45, chartHeight + 15);
    }

    ctx.strokeStyle = '#2a2e39';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, chartWidth, chartHeight);

  }, [
    priceRange,
    scrollOffset,
    zoomLevel,
    candles,
    manualVPs,
    selectedVP,
    crosshair,
    activeTool,
    isDrawing,
    drawStart,
    drawEnd,
    showSessions,
    sessionsList,
    timeframe,
    binsCount,
    activeAsset
  ]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    drawChart();
  }, [drawChart]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { chartWidth, chartHeight } = getCanvasDimensions();
    if (x > chartWidth || y > chartHeight) return;

    if (activeTool === 'fixedVP') {
      setIsDrawing(true);
      const price = pixelToPrice(y);
      const time = pixelToTime(x);
      const startPoint = { x, y, price, time };
      setDrawStart(startPoint);
      setDrawEnd(startPoint);
    } else if (activeTool === 'eraser') {
      const targetPrice = pixelToPrice(y);
      const targetTime = pixelToTime(x);

      const target = manualVPs.find(vp => {
        const pLow = Math.min(vp.priceStart, vp.priceEnd);
        const pHigh = Math.max(vp.priceStart, vp.priceEnd);
        const tLow = Math.min(vp.timeStart, vp.timeEnd);
        const tHigh = Math.max(vp.timeStart, vp.timeEnd);

        return targetPrice >= pLow && targetPrice <= pHigh && targetTime >= tLow && targetTime <= tHigh;
      });

      if (target) {
        const filtered = manualVPs.filter(vp => vp.id !== target.id);
        saveVPs(filtered);
        if (selectedVP?.id === target.id) {
          setSelectedVP(null);
        }
      }
    } else {
      const targetPrice = pixelToPrice(y);
      const targetTime = pixelToTime(x);

      const clicked = manualVPs.find(vp => {
        const pLow = Math.min(vp.priceStart, vp.priceEnd);
        const pHigh = Math.max(vp.priceStart, vp.priceEnd);
        const tLow = Math.min(vp.timeStart, vp.timeEnd);
        const tHigh = Math.max(vp.timeStart, vp.timeEnd);

        return targetPrice >= pLow && targetPrice <= pHigh && targetTime >= tLow && targetTime <= tHigh;
      });

      if (clicked) {
        setSelectedVP(clicked);
      } else {
        setSelectedVP(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { chartWidth, chartHeight } = getCanvasDimensions();
    const boundedX = Math.max(0, Math.min(chartWidth, x));
    const boundedY = Math.max(0, Math.min(chartHeight, y));

    const price = pixelToPrice(boundedY);
    const time = pixelToTime(boundedX);

    setCrosshair({ x: boundedX, y: boundedY, price, time });

    if (isDrawing && activeTool === 'fixedVP' && drawStart) {
      setDrawEnd({ x: boundedX, y: boundedY, price, time });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && activeTool === 'fixedVP' && drawStart && drawEnd) {
      setIsDrawing(false);

      const tStart = Math.min(drawStart.time, drawEnd.time);
      const tEnd = Math.max(drawStart.time, drawEnd.time);
      const pStart = Math.min(drawStart.price, drawEnd.price);
      const pEnd = Math.max(drawStart.price, drawEnd.price);

      if (tEnd - tStart > 10 && pEnd - pStart > 0.1) {
        const vpData = buildFixedRangeVP(candles, pStart, pEnd, tStart, tEnd, binsCount);
        if (vpData) {
          const newVP: ManualVP = {
            id: `FRVP-${Date.now()}`,
            priceStart: pStart,
            priceEnd: pEnd,
            timeStart: tStart,
            timeEnd: tEnd,
            vp: vpData,
            xPosition: drawEnd.x
          };
          const updated = [...manualVPs, newVP];
          saveVPs(updated);
          setSelectedVP(newVP);
        }
      }

      setDrawStart(null);
      setDrawEnd(null);
      setActiveTool('crosshair');
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(50, prev * 1.15));
    } else {
      setZoomLevel(prev => Math.max(0.05, prev / 1.15));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setScrollOffset(prev => Math.max(0, prev - 50));
      } else if (e.key === 'ArrowLeft') {
        setScrollOffset(prev => prev + 50);
      } else if (e.key === 'Escape') {
        setIsDrawing(false);
        setDrawStart(null);
        setDrawEnd(null);
        setActiveTool('crosshair');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#131722] text-[#d1d4dc] overflow-hidden select-none font-sans">
      <header className="flex flex-wrap items-center justify-between px-4 py-2 border-b border-[#2a2e39] bg-[#1c2030] gap-2 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#2962FF] text-white rounded-lg shadow-md flex items-center justify-center">
            <BarChart2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              FRVP WORKSPACE
              <span className="text-[10px] bg-[#2962FF]/20 text-[#2962FF] font-medium px-2 py-0.5 rounded-full border border-[#2962FF]/40">
                PRO CLONE
              </span>
            </h1>
            <p className="text-[10px] text-[#787b86] font-mono leading-none">TradingView Mathematical Profile</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center bg-[#24293e] rounded-md border border-[#363c4e] px-2 py-1">
            <span className="text-[10px] font-mono text-[#829ab1] mr-1.5 uppercase font-bold">Symbol:</span>
            <select 
              value={selectedSymbol} 
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
            >
              {ASSETS.map(asset => (
                <option key={asset.symbol} value={asset.symbol} className="bg-[#1c2030] text-white font-mono">
                  {asset.symbol} ({asset.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-[#24293e] rounded-md border border-[#363c4e] p-0.5">
            {['1m', '5m', '15m', '1H', '4H'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  timeframe === tf 
                    ? 'bg-[#2962FF] text-white shadow-sm' 
                    : 'text-[#85929E] hover:text-white hover:bg-[#2c324b]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-[#24293e] rounded-md border border-[#363c4e] p-0.5">
            <span className="text-[10px] font-mono text-[#829ab1] px-2 uppercase font-bold">Bins:</span>
            {[24, 48, 72].map(bin => (
              <button
                key={bin}
                onClick={() => setBinsCount(bin)}
                className={`px-2 py-1 text-xs font-mono font-bold rounded ${
                  binsCount === bin
                    ? 'bg-[#2962FF] text-white'
                    : 'text-[#85929E] hover:text-white hover:bg-[#2c324b]'
                }`}
              >
                {bin}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSessions(prev => !prev)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border flex items-center gap-1.5 transition-all ${
              showSessions 
                ? 'bg-[#ff9800]/10 border-[#ff9800]/50 text-[#ff9800]' 
                : 'bg-[#24293e] border-[#363c4e] text-[#85929E] hover:text-white'
            }`}
            title="Auto Session Volume Profiles"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Session Profiles: {showSessions ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleClearAllVPs}
            className="px-3 py-1.5 bg-[#ef5350]/10 border border-[#ef5350]/30 hover:bg-[#ef5350]/20 text-[#ef5350] hover:text-white text-xs font-semibold rounded-md transition-all flex items-center gap-1.5"
            title="Clear all manual profiles"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear VPs</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 w-full overflow-hidden relative">
        <div className="w-14 bg-[#1c2030] border-r border-[#2a2e39] flex flex-col items-center py-4 gap-4 shrink-0 z-40 shadow-lg">
          <span className="text-[8px] font-mono text-[#627d98] uppercase tracking-wider font-bold">Tools</span>

          <button
            onClick={() => {
              setActiveTool('crosshair');
              setIsDrawing(false);
            }}
            className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all ${
              activeTool === 'crosshair'
                ? 'bg-[#2962FF] text-white shadow-md shadow-[#2962FF]/20'
                : 'text-[#829ab1] hover:text-white hover:bg-[#24293e]'
            }`}
            title="Crosshair Navigation Tool"
          >
            <Crosshair className="w-5 h-5" />
            <span className="text-[8px] font-sans font-medium mt-0.5 scale-90">Cross</span>
          </button>

          <button
            onClick={() => {
              setActiveTool('fixedVP');
              setIsDrawing(false);
            }}
            className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all ${
              activeTool === 'fixedVP'
                ? 'bg-[#2962FF] text-white shadow-md shadow-[#2962FF]/20 animate-pulse'
                : 'text-[#829ab1] hover:text-white hover:bg-[#24293e]'
            }`}
            title="Fixed Range Volume Profile Box"
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[8px] font-sans font-medium mt-0.5 scale-90">FRVP</span>
          </button>

          <button
            onClick={() => {
              setActiveTool('eraser');
              setIsDrawing(false);
            }}
            className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all ${
              activeTool === 'eraser'
                ? 'bg-[#ef5350] text-white shadow-md shadow-[#ef5350]/20'
                : 'text-[#829ab1] hover:text-[#ef5350] hover:bg-[#ef5350]/10'
            }`}
            title="Click an existing FRVP profile boundary to erase"
          >
            <Eraser className="w-5 h-5" />
            <span className="text-[8px] font-sans font-medium mt-0.5 scale-90">Erase</span>
          </button>

          <div className="w-6 h-px bg-[#2a2e39] my-1" />

          <div className="flex flex-col gap-2 items-center mt-auto">
            <div className="p-1 rounded-full bg-[#26a69a]/10 text-[#26a69a]" title="Market Connected">
              <Activity className="w-4 h-4 animate-bounce" />
            </div>
            <span className="text-[8px] font-mono text-[#829ab1] scale-90 font-bold uppercase">Live</span>
          </div>
        </div>

        <div 
          ref={containerRef} 
          className="flex-1 h-full bg-[#131722] relative overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            className="absolute inset-0 cursor-crosshair block"
          />

          <div className="absolute bottom-4 left-4 bg-[#1c2030]/90 border border-[#2a2e39] rounded-lg p-2.5 shadow-xl max-w-xs font-mono text-[10px] text-[#829ab1] flex flex-col gap-1 pointer-events-none z-30">
            <div className="flex items-center justify-between text-white font-bold mb-1">
              <span>CONTROLS GUIDE:</span>
              <span className="text-[9px] bg-[#2962FF]/20 text-[#2962FF] px-1.5 py-0.5 rounded">PST Active</span>
            </div>
            <div>&bull; Mouse Scroll Wheel: Zoom Price/Time</div>
            <div>&bull; Arrow Key Left/Right: Pan Scroll Timeline</div>
            <div>&bull; Interactive Tool Selected: <span className="text-[#2962FF] font-bold uppercase">{activeTool}</span></div>
          </div>

          <div className="absolute top-4 right-4 bg-[#ff9800]/10 border border-[#ff9800]/30 rounded-lg px-3 py-1.5 text-[10px] text-[#ff9800] flex items-center gap-2 pointer-events-none z-30 font-mono">
            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Session Tracker Active (PKT timezone)</span>
          </div>
        </div>

        <div className="w-80 bg-[#1c2030] border-l border-[#2a2e39] flex flex-col shrink-0 overflow-y-auto h-full z-40">
          <div className="p-4 border-b border-[#2a2e39] bg-[#161a29]">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2962FF]" />
              Profile Analytics
            </h2>
            <p className="text-[10px] text-[#787b86]">Precise volume node levels & ranges</p>
          </div>

          {selectedVP ? (
            <div className="p-4 flex flex-col gap-4">
              <div className="p-3 rounded-lg bg-[#24293e] border border-[#363c4e] flex flex-col gap-1.5 relative">
                <button 
                  onClick={() => setSelectedVP(null)}
                  className="absolute top-2 right-2 text-[#787b86] hover:text-white transition-all"
                  title="Close analysis"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="text-[10px] font-mono text-[#829ab1] font-bold uppercase">Selected Range:</div>
                <div className="text-white text-xs font-bold flex items-center justify-between">
                  <span>FRVP ID:</span>
                  <span className="font-mono text-[10px] bg-[#2962FF]/20 text-[#2962FF] px-2 py-0.5 rounded">
                    {selectedVP.id.substring(selectedVP.id.length - 8)}
                  </span>
                </div>
                <div className="w-full h-px bg-[#363c4e] my-1" />
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div>
                    <span className="text-[#829ab1] block">Price Low:</span>
                    <span className="text-white font-semibold">{Math.min(selectedVP.priceStart, selectedVP.priceEnd).toFixed(activeAsset.decimals)}</span>
                  </div>
                  <div>
                    <span className="text-[#829ab1] block">Price High:</span>
                    <span className="text-white font-semibold">{Math.max(selectedVP.priceStart, selectedVP.priceEnd).toFixed(activeAsset.decimals)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#829ab1] block">Time Range:</span>
                    <span className="text-white">
                      {new Date(selectedVP.timeStart * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(selectedVP.timeEnd * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-[#ef5350]/5 border border-[#ef5350]/20 text-center">
                  <div className="text-[8px] font-bold text-[#ef5350] uppercase tracking-wider">POC (Control)</div>
                  <div className="text-sm font-bold text-white mt-1 font-mono">
                    {selectedVP.vp.poc.toFixed(activeAsset.decimals)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#ffd700]/5 border border-[#ffd700]/20 text-center">
                  <div className="text-[8px] font-bold text-[#ffd700] uppercase tracking-wider">VAH (High)</div>
                  <div className="text-sm font-bold text-white mt-1 font-mono">
                    {selectedVP.vp.vah.toFixed(activeAsset.decimals)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#ffd700]/5 border border-[#ffd700]/20 text-center">
                  <div className="text-[8px] font-bold text-[#ffd700] uppercase tracking-wider">VAL (Low)</div>
                  <div className="text-sm font-bold text-white mt-1 font-mono">
                    {selectedVP.vp.val.toFixed(activeAsset.decimals)}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#161a29] border border-[#2a2e39] text-[10px] font-mono flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#829ab1]">Total Session Volume:</span>
                  <span className="text-white font-bold">{selectedVP.vp.totalVol.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#829ab1]">Average Bar Volume:</span>
                  <span className="text-white">{Math.round(selectedVP.vp.avgVolume).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#829ab1]">Execution Candles count:</span>
                  <span className="text-white font-bold">{selectedVP.vp.count}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-[#829ab1] uppercase tracking-wider block">Volume Distribution Bars:</span>
                <div className="flex flex-col gap-1 bg-[#161a29] border border-[#2a2e39] rounded-lg p-2 max-h-56 overflow-y-auto">
                  {selectedVP.vp.bins.map((b, index) => {
                    const isPoc = Math.abs(b.mid - selectedVP.vp.poc) < 0.05;
                    const isValueArea = b.mid >= selectedVP.vp.val && b.mid <= selectedVP.vp.vah;
                    return (
                      <div key={index} className="flex items-center gap-1.5 text-[9px] font-mono">
                        <span className={`w-12 shrink-0 truncate ${isPoc ? 'text-[#ef5350] font-bold' : isValueArea ? 'text-[#ffd700]' : 'text-[#787b86]'}`}>
                          {b.mid.toFixed(activeAsset.decimals)}
                        </span>
                        <div className="flex-1 bg-[#24293e] h-2.5 rounded overflow-hidden flex relative">
                          <div 
                            className="bg-[#26a69a]/70 h-full" 
                            style={{ width: `${b.width * (b.bullishVol / (b.vol || 1))}%` }} 
                          />
                          <div 
                            className="bg-[#ef5350]/70 h-full" 
                            style={{ width: `${b.width * (b.bearishVol / (b.vol || 1))}%` }} 
                          />
                        </div>
                        <span className="w-10 text-right text-[#829ab1] truncate">
                          {Math.round(b.vol).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div className="flex flex-col gap-1">
                  <span className="text-[#26a69a] font-bold uppercase tracking-wide flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    HVNs (Support)
                  </span>
                  <div className="flex flex-col gap-1 bg-[#161a29] border border-[#2a2e39] rounded p-2 max-h-24 overflow-y-auto font-mono">
                    {selectedVP.vp.hvn.length > 0 ? (
                      selectedVP.vp.hvn.map((node, i) => (
                        <div key={i} className="text-white py-0.5 border-b border-[#2a2e39]/50">
                          {node.toFixed(activeAsset.decimals)}
                        </div>
                      ))
                    ) : (
                      <span className="text-[#787b86] italic text-[9px]">None found</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[#ef5350] font-bold uppercase tracking-wide flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    LVNs (Gaps)
                  </span>
                  <div className="flex flex-col gap-1 bg-[#161a29] border border-[#2a2e39] rounded p-2 max-h-24 overflow-y-auto font-mono">
                    {selectedVP.vp.lvn.length > 0 ? (
                      selectedVP.vp.lvn.map((node, i) => (
                        <div key={i} className="text-white py-0.5 border-b border-[#2a2e39]/50">
                          {node.toFixed(activeAsset.decimals)}
                        </div>
                      ))
                    ) : (
                      <span className="text-[#787b86] italic text-[9px]">None found</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const filtered = manualVPs.filter(vp => vp.id !== selectedVP.id);
                  saveVPs(filtered);
                  setSelectedVP(null);
                }}
                className="w-full py-2 bg-[#ef5350]/15 border border-[#ef5350]/40 text-[#ef5350] hover:bg-[#ef5350] hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove Profile Range
              </button>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-4 text-[#829ab1] leading-relaxed">
              <div className="p-4 rounded-xl bg-[#24293e]/50 border border-[#363c4e] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <HelpCircle className="w-4 h-4 text-[#ff9800]" />
                  Volume Profile Guide
                </div>
                <p className="text-[10px] text-justify">
                  The Fixed Range Volume Profile displays trading volume distributed horizontally across designated price zones. This exposes structural market depth rather than simple vertical time-based distributions.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Trading Terminology</span>
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef5350] mt-1 shrink-0" />
                    <div>
                      <strong className="text-white text-[10px] block">Point of Control (POC):</strong>
                      <span className="text-[9px] block">The single price level containing the highest executed volume. Acts as a core magnetic value attraction node.</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff9800] mt-1 shrink-0" />
                    <div>
                      <strong className="text-white text-[10px] block">Value Area High/Low (VAH/VAL):</strong>
                      <span className="text-[9px] block">Boundaries enclosing 70% of the selected session's total accumulated volumes. Represents agreed-upon fair value ranges.</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] mt-1 shrink-0" />
                    <div>
                      <strong className="text-white text-[10px] block">High Volume Nodes (HVN):</strong>
                      <span className="text-[9px] block">Significant execution peaks representing prolonged price acceptance (Support / Resistance zones).</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef5350]/70 mt-1 shrink-0" />
                    <div>
                      <strong className="text-white text-[10px] block">Low Volume Nodes (LVN):</strong>
                      <span className="text-[9px] block">Liquidity voids where price moved extremely fast due to a lack of buyer/seller matching (Gaps / Slippage).</span>
                    </div>
                  </div>
                </div>
              </div>

              {manualVPs.length > 0 ? (
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-[#2a2e39]">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center justify-between">
                    <span>Active Manual Profiles ({manualVPs.length})</span>
                    <BarChart2 className="w-3.5 h-3.5 text-[#2962FF]" />
                  </span>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                    {manualVPs.map(vp => (
                      <div 
                        key={vp.id}
                        onClick={() => setSelectedVP(vp)}
                        className="p-2 rounded bg-[#24293e] hover:bg-[#2c324b] border border-[#363c4e] flex items-center justify-between cursor-pointer transition-all text-[10px] font-mono text-[#d1d4dc]"
                      >
                        <div className="flex items-center gap-1.5">
                          <LineChart className="w-3 h-3 text-[#2962FF]" />
                          <span>FRVP #{vp.id.substring(vp.id.length - 4)}</span>
                        </div>
                        <span className="text-[#829ab1] scale-90">
                          {Math.round(vp.vp.totalVol).toLocaleString()} Vol
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 border border-dashed border-[#2a2e39] rounded-lg mt-4 text-[10px] italic">
                  No active profiles drawn on current chart.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="h-8 bg-[#161a29] border-t border-[#2a2e39] shrink-0 flex items-center justify-between px-4 text-[10px] font-mono text-[#829ab1] z-50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[#26a69a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-ping" />
            WORKSPACE CONNECTED
          </span>
          <span className="text-white">Active Symbol: <strong className="text-[#ff9800]">{selectedSymbol}</strong></span>
          <span>Timeframe: <strong className="text-[#2196f3]">{timeframe}</strong></span>
          <span>Calculated Bins: <strong>{binsCount}</strong></span>
        </div>

        <div className="flex items-center gap-4">
          <span>Morning Session: <strong className="text-[#ff9800]">06:00 - 12:00 PKT</strong></span>
          <span>Evening Session: <strong className="text-[#2196f3]">18:30 - 22:00 PKT</strong></span>
          <span className="text-white font-bold bg-[#2962FF] px-2 py-0.5 rounded">UTC+5 Asia/Karachi</span>
        </div>
      </footer>
    </div>
  );
}
