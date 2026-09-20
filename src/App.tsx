import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BarChart2, Crosshair, Activity, Clock } from 'lucide-react';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
      volume: volume,
    });

    currentPrice = close;
  }

  return candles;
}

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('GC=F');
  const [timeframe, setTimeframe] = useState<string>('5m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 100 });
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; price: number; time: number } | null>(null);

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
        max: maxPrice + padding,
      });
    }
  }, [selectedSymbol, timeframe]);

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
      chartHeight: height - BOTTOM_AXIS_HEIGHT,
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

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, chartWidth, chartHeight } = getCanvasDimensions();

    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, width, height);

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

    if (crosshair) {
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
  }, [activeAsset, candles, crosshair, priceRange, timeframe, timeToPixel, priceToPixel, zoomLevel]);

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
              CHART OVERVIEW
              <span className="text-[10px] bg-[#2962FF]/20 text-[#2962FF] font-medium px-2 py-0.5 rounded-full border border-[#2962FF]/40">
                LIVE
              </span>
            </h1>
            <p className="text-[10px] text-[#787b86] font-mono leading-none">Synthetic market data</p>
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
        </div>
      </header>

      <div className="flex flex-1 w-full overflow-hidden relative">
        <div
          ref={containerRef}
          className="flex-1 h-full bg-[#131722] relative overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            className="absolute inset-0 cursor-crosshair block"
          />

          <div className="absolute bottom-4 left-4 bg-[#1c2030]/90 border border-[#2a2e39] rounded-lg p-2.5 shadow-xl max-w-xs font-mono text-[10px] text-[#829ab1] flex flex-col gap-1 pointer-events-none z-30">
            <div className="flex items-center justify-between text-white font-bold mb-1">
              <span>CONTROLS</span>
              <span className="text-[9px] bg-[#2962FF]/20 text-[#2962FF] px-1.5 py-0.5 rounded">ACTIVE</span>
            </div>
            <div>&bull; Mouse Scroll Wheel: Zoom Price/Time</div>
            <div>&bull; Arrow Key Left/Right: Pan Timeline</div>
            <div>&bull; Crosshair Tracking: <span className="text-[#2962FF] font-bold uppercase">ON</span></div>
          </div>

          <div className="absolute top-4 right-4 bg-[#ff9800]/10 border border-[#ff9800]/30 rounded-lg px-3 py-1.5 text-[10px] text-[#ff9800] flex items-center gap-2 pointer-events-none z-30 font-mono">
            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Market Feed Active</span>
          </div>
        </div>
      </div>

      <footer className="h-8 bg-[#161a29] border-t border-[#2a2e39] shrink-0 flex items-center justify-between px-4 text-[10px] font-mono text-[#829ab1] z-50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[#26a69a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-ping" />
            MARKET ONLINE
          </span>
          <span className="text-white">Active Symbol: <strong className="text-[#ff9800]">{selectedSymbol}</strong></span>
          <span>Timeframe: <strong className="text-[#2196f3]">{timeframe}</strong></span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[#26a69a]">
            <Activity className="w-3.5 h-3.5" />
            Live chart stream
          </span>
        </div>
      </footer>
    </div>
  );
}
