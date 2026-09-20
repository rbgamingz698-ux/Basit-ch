import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BarChart2, Activity, Clock } from 'lucide-react';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
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

export function generateSyntheticHistory(symbol: string, timeframe: string, count: number = 1000): Candle[] {
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
    const value = Math.sin(seed++) * 10000;
    return value - Math.floor(value);
  };

  const supportZone = asset.basePrice * 0.985;
  const resistanceZone = asset.basePrice * 1.015;

  for (let i = 0; i < count; i++) {
    currentTimestamp += spacing;

    let volatility = 0.0012;
    let directionalBias = 0.00002;

    if (currentPrice < supportZone) directionalBias += 0.0005;
    if (currentPrice > resistanceZone) directionalBias -= 0.0005;

    const percentChange = (random() - 0.49) * 2 * volatility + directionalBias;
    const open = currentPrice;
    const close = currentPrice * (1 + percentChange);
    const wickHigh = Math.max(open, close) * (1 + random() * volatility * 0.4);
    const wickLow = Math.min(open, close) * (1 - random() * volatility * 0.4);

    candles.push({
      time: currentTimestamp,
      open: Number(open.toFixed(asset.decimals)),
      high: Number(Math.max(wickHigh, open, close).toFixed(asset.decimals)),
      low: Number(Math.min(wickLow, open, close).toFixed(asset.decimals)),
      close: Number(close.toFixed(asset.decimals)),
    });

    currentPrice = close;
  }

  return candles;
}

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('GC=F');
  const [timeframe, setTimeframe] = useState('5m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1.2);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100 });
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; price: number; time: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeAsset = useMemo(() => ASSETS.find(a => a.symbol === selectedSymbol) || ASSETS[0], [selectedSymbol]);

  useEffect(() => {
    const data = generateSyntheticHistory(selectedSymbol, timeframe, 2000);
    setCandles(data);

    if (data.length > 0) {
      const recent = data.slice(-100);
      const minPrice = Math.min(...recent.map(c => c.low));
      const maxPrice = Math.max(...recent.map(c => c.high));
      const padding = (maxPrice - minPrice) * 0.15 || 10;
      setPriceRange({ min: minPrice - padding, max: maxPrice + padding });
    }
  }, [selectedSymbol, timeframe]);

  const RIGHT_AXIS_WIDTH = 75;
  const BOTTOM_AXIS_HEIGHT = 30;

  const getCanvasDimensions = () => {
    if (!canvasRef.current) return { width: 800, height: 500, chartWidth: 725, chartHeight: 470 };
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    return { width, height, chartWidth: width - RIGHT_AXIS_WIDTH, chartHeight: height - BOTTOM_AXIS_HEIGHT };
  };

  const priceToPixel = useCallback((price: number) => {
    const { chartHeight } = getCanvasDimensions();
    const ratio = (price - priceRange.min) / (priceRange.max - priceRange.min || 1);
    return chartHeight * (1 - ratio);
  }, [priceRange]);

  const pixelToPrice = useCallback((y: number) => {
    const { chartHeight } = getCanvasDimensions();
    const ratio = 1 - y / chartHeight;
    return priceRange.min + ratio * (priceRange.max - priceRange.min);
  }, [priceRange]);

  const timeToPixel = useCallback((time: number) => {
    const { chartWidth } = getCanvasDimensions();
    if (candles.length === 0) return 0;
    const lastCandle = candles[candles.length - 1];
    return chartWidth - scrollOffset - (lastCandle.time - time) * zoomLevel;
  }, [candles, scrollOffset, zoomLevel]);

  const pixelToTime = useCallback((x: number) => {
    const { chartWidth } = getCanvasDimensions();
    if (candles.length === 0) return Date.now() / 1000;
    const lastCandle = candles[candles.length - 1];
    return lastCandle.time - (chartWidth - scrollOffset - x) / zoomLevel;
  }, [candles, scrollOffset, zoomLevel]);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { width, height, chartWidth, chartHeight } = getCanvasDimensions();
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#2a2e39';
    ctx.lineWidth = 1;

    const priceStep = (priceRange.max - priceRange.min) / 10;
    for (let i = 0; i <= 10; i++) {
      const price = priceRange.min + i * priceStep;
      const y = priceToPixel(price);
      if (y < 0 || y > chartHeight) continue;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      ctx.fillStyle = '#9fb3c8';
      ctx.font = '10px sans-serif';
      ctx.fillText(price.toFixed(activeAsset.decimals), chartWidth + 5, y + 4);
    }

    if (candles.length > 0) {
      const gridCount = 8;
      const totalSeconds = candles[candles.length - 1].time - candles[0].time;
      for (let i = 0; i <= gridCount; i++) {
        const targetTime = candles[0].time + i * totalSeconds / gridCount;
        const x = timeToPixel(targetTime);
        if (x < 0 || x > chartWidth) continue;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, chartHeight);
        ctx.stroke();
        const date = new Date(targetTime * 1000);
        ctx.fillStyle = '#829ab1';
        ctx.font = '10px monospace';
        ctx.fillText(`${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`, x - 25, chartHeight + 18);
      }
    }

    const candleWidth = Math.max(1.5, zoomLevel * (timeframe === '1m' ? 45 : timeframe === '5m' ? 220 : 600));
    candles.forEach(candle => {
      const x = timeToPixel(candle.time);
      if (x + candleWidth < 0 || x - candleWidth > chartWidth) return;
      const yOpen = priceToPixel(candle.open);
      const yClose = priceToPixel(candle.close);
      const color = candle.close >= candle.open ? '#26a69a' : '#ef5350';

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, priceToPixel(candle.high));
      ctx.lineTo(x, priceToPixel(candle.low));
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, Math.min(yOpen, yClose), Math.max(1.2, candleWidth), Math.max(1, Math.abs(yOpen - yClose)));
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
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText(crosshair.price.toFixed(activeAsset.decimals), chartWidth + 6, crosshair.y + 4);
    }

    ctx.strokeStyle = '#2a2e39';
    ctx.strokeRect(0, 0, chartWidth, chartHeight);
  }, [activeAsset, candles, crosshair, priceRange, priceToPixel, timeframe, timeToPixel, zoomLevel]);

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
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { chartWidth, chartHeight } = getCanvasDimensions();
    const x = Math.max(0, Math.min(chartWidth, event.clientX - rect.left));
    const y = Math.max(0, Math.min(chartHeight, event.clientY - rect.top));
    setCrosshair({ x, y, price: pixelToPrice(y), time: pixelToTime(x) });
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setZoomLevel(prev => event.deltaY < 0 ? Math.min(50, prev * 1.15) : Math.max(0.05, prev / 1.15));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setScrollOffset(prev => Math.max(0, prev - 50));
      if (event.key === 'ArrowLeft') setScrollOffset(prev => prev + 50);
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
            <h1 className="text-sm font-bold text-white tracking-wide">CHART OVERVIEW</h1>
            <p className="text-[10px] text-[#787b86] font-mono leading-none">Synthetic market data</p>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <label className="flex items-center bg-[#24293e] rounded-md border border-[#363c4e] px-2 py-1">
            <span className="text-[10px] font-mono text-[#829ab1] mr-1.5 uppercase font-bold">Symbol:</span>
            <select value={selectedSymbol} onChange={event => setSelectedSymbol(event.target.value)} className="bg-transparent border-none text-xs font-bold text-white focus:outline-none cursor-pointer pr-1">
              {ASSETS.map(asset => <option key={asset.symbol} value={asset.symbol} className="bg-[#1c2030] text-white">{asset.symbol} ({asset.name})</option>)}
            </select>
          </label>
          <div className="flex items-center bg-[#24293e] rounded-md border border-[#363c4e] p-0.5">
            {['1m', '5m', '15m', '1H', '4H'].map(tf => <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3 py-1 text-xs font-semibold rounded ${timeframe === tf ? 'bg-[#2962FF] text-white' : 'text-[#85929E] hover:text-white hover:bg-[#2c324b]'}`}>{tf}</button>)}
          </div>
        </div>
      </header>

      <main ref={containerRef} className="flex-1 h-full bg-[#131722] relative overflow-hidden">
        <canvas ref={canvasRef} onMouseMove={handleMouseMove} onWheel={handleWheel} className="absolute inset-0 cursor-crosshair block" />
        <div className="absolute bottom-4 left-4 bg-[#1c2030]/90 border border-[#2a2e39] rounded-lg p-2.5 shadow-xl max-w-xs font-mono text-[10px] text-[#829ab1] flex flex-col gap-1 pointer-events-none">
          <div className="text-white font-bold mb-1">CONTROLS</div>
          <div>&bull; Mouse Scroll Wheel: Zoom</div>
          <div>&bull; Arrow Keys: Pan Timeline</div>
          <div>&bull; Crosshair Tracking: <span className="text-[#2962FF] font-bold">ON</span></div>
        </div>
        <div className="absolute top-4 right-4 bg-[#ff9800]/10 border border-[#ff9800]/30 rounded-lg px-3 py-1.5 text-[10px] text-[#ff9800] flex items-center gap-2 pointer-events-none z-30 font-mono">
          <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Market Feed Active</span>
        </div>
      </main>

      <footer className="h-8 bg-[#161a29] border-t border-[#2a2e39] shrink-0 flex items-center justify-between px-4 text-[10px] font-mono text-[#829ab1] z-50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[#26a69a]"><span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-ping" />MARKET ONLINE</span>
          <span className="text-white">Active Symbol: <strong className="text-[#ff9800]">{selectedSymbol}</strong></span>
          <span>Timeframe: <strong className="text-[#2196f3]">{timeframe}</strong></span>
        </div>
        <span className="flex items-center gap-1 text-[#26a69a]"><Activity className="w-3.5 h-3.5" />Live chart stream</span>
      </footer>
    </div>
  );
}
