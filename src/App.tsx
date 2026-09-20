import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Activity, BarChart2, Clock, MoreHorizontal, Plus, Search, ChevronLeft, ChevronRight, CircleDashed, Sparkles } from 'lucide-react';

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
  { symbol: 'US30', name: 'Dow Jones', basePrice: 51682, decimals: 2, tickSize: 0.01 },
  { symbol: 'NQ-F', name: 'NASDAQ 100', basePrice: 19850, decimals: 0, tickSize: 0.25 },
  { symbol: 'GC=F', name: 'Gold Futures', basePrice: 2580, decimals: 1, tickSize: 0.1 },
];

export function generateSyntheticHistory(symbol: string, timeframe: string, count: number = 1500): Candle[] {
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
    const wickHigh = Math.max(open, close) * (1 + random() * volatility * 0.5);
    const wickLow = Math.min(open, close) * (1 - random() * volatility * 0.5);

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
  const [selectedSymbol, setSelectedSymbol] = useState('US30');
  const [timeframe, setTimeframe] = useState('1m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1.2);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100 });
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; price: number; time: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeAsset = useMemo(() => ASSETS.find(a => a.symbol === selectedSymbol) || ASSETS[0], [selectedSymbol]);

  useEffect(() => {
    const data = generateSyntheticHistory(selectedSymbol, timeframe, 1200);
    setCandles(data);

    if (data.length > 0) {
      const recent = data.slice(-80);
      const minPrice = Math.min(...recent.map(c => c.low));
      const maxPrice = Math.max(...recent.map(c => c.high));
      const padding = (maxPrice - minPrice) * 0.18 || 10;
      setPriceRange({ min: minPrice - padding, max: maxPrice + padding });
    }
  }, [selectedSymbol, timeframe]);

  const RIGHT_AXIS_WIDTH = 75;
  const BOTTOM_AXIS_HEIGHT = 24;

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
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0d1728';
    ctx.fillRect(0, 0, width, height);

    // grid / price lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.17)';
    ctx.lineWidth = 1;
    const priceStep = (priceRange.max - priceRange.min) / 8;
    for (let i = 0; i <= 8; i++) {
      const price = priceRange.min + i * priceStep;
      const y = priceToPixel(price);
      if (y < 0 || y > chartHeight) continue;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
    }

    if (candles.length > 0) {
      const gridCount = 5;
      const totalSeconds = candles[candles.length - 1].time - candles[0].time;
      for (let i = 0; i <= gridCount; i++) {
        const targetTime = candles[0].time + i * totalSeconds / gridCount;
        const x = timeToPixel(targetTime);
        if (x < 0 || x > chartWidth) continue;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, chartHeight);
        ctx.stroke();
      }
    }

    // candlesticks
    const candleWidth = Math.max(1.5, zoomLevel * (timeframe === '1m' ? 32 : timeframe === '5m' ? 58 : timeframe === '15m' ? 96 : 160));
    candles.forEach(candle => {
      const x = timeToPixel(candle.time);
      if (x + candleWidth < 0 || x - candleWidth > chartWidth) return;

      const yOpen = priceToPixel(candle.open);
      const yClose = priceToPixel(candle.close);
      const yHigh = priceToPixel(candle.high);
      const yLow = priceToPixel(candle.low);
      const isUp = candle.close >= candle.open;
      const color = isUp ? '#2bbf91' : '#f04d5d';

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();
      ctx.fillRect(x - candleWidth / 2, Math.min(yOpen, yClose), Math.max(1.5, candleWidth), Math.max(2, Math.abs(yOpen - yClose)));
    });

    // crosshair
    if (crosshair) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
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

      ctx.fillStyle = '#1b2335';
      ctx.fillRect(chartWidth + 2, crosshair.y - 12, RIGHT_AXIS_WIDTH, 24);
      ctx.fillStyle = '#e5eefc';
      ctx.font = '11px monospace';
      ctx.fillText(crosshair.price.toFixed(activeAsset.decimals), chartWidth + 8, crosshair.y + 4);
    }

    // right price labels
    for (let i = 0; i <= 8; i++) {
      const price = priceRange.min + i * priceStep;
      const y = priceToPixel(price);
      if (y < 0 || y > chartHeight) continue;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(price.toFixed(activeAsset.decimals), chartWidth + 8, y + 4);
    }

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.strokeRect(0, 0, chartWidth, chartHeight);
  }, [activeAsset, candles, crosshair, priceRange, priceToPixel, timeframe, timeToPixel, zoomLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    drawChart();
  }, [drawChart]);

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

  const latestClose = candles[candles.length - 1]?.close ?? 51682;
  const previousClose = candles[candles.length - 2]?.close ?? latestClose;
  const delta = latestClose - previousClose;
  const percent = (delta / previousClose) * 100;

  return (
    <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-[430px] h-[915px] rounded-[32px] overflow-hidden border border-[#1c2a3a] bg-[#0b1524] shadow-[0_20px_80px_rgba(0,0,0,0.6)] relative">
        <div className="h-8 px-5 pt-4 flex justify-between items-center text-[#dbe7ff] text-[11px] font-medium">
          <span>6:07 PM</span>
          <div className="flex items-center gap-2 text-[10px]">
            <span>3.42</span>
            <span className="text-[#aabbd2]">K/s</span>
            <span className="h-2.5 w-2.5 rounded-full bg-[#dfe7f7] opacity-90" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#dfe7f7] opacity-75" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#dfe7f7] opacity-60" />
          </div>
        </div>

        <div className="px-4 pt-2 pb-2 flex items-center gap-3">
          <div className="flex-1 h-12 rounded-[22px] bg-[#f2f3f5] text-[#101827] flex items-center justify-between px-4 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-[#0f172a] flex items-center justify-center text-[10px] font-bold">◌</div>
              <span className="text-[27px] font-medium tracking-tight">studio.google.com</span>
            </div>
          </div>
          <button className="w-12 h-12 rounded-full bg-white text-[#111827] flex items-center justify-center shadow-sm">
            <Plus className="w-7 h-7" />
          </button>
          <button className="w-11 h-11 rounded-full bg-[#dfe7f7] text-[#111827] flex items-center justify-center">
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center justify-between bg-[#1e2a3a] border border-[#2a3b55] rounded-full px-2 py-1.5 text-xs">
            <div className="flex items-center gap-1.5 bg-[#0d1522] rounded-full px-2 py-1.5 text-[#dfeafd]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#36d399]" />
              <span className="font-medium">US30</span>
            </div>
            <div className="flex items-center gap-1 text-[#9eb3d9]">
              {['1m', '5m', '15m', '1H', '4H'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 rounded-md ${timeframe === tf ? 'bg-[#2f5fff] text-white' : 'text-[#b4c8f5]'}`}
                >
                  {tf}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1 bg-[#1d2434] px-2 py-1 rounded-md text-[#e4efff]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#fbbf24]" />
              Theme
            </button>
            <button className="flex items-center gap-1 bg-[#1d2434] px-2 py-1 rounded-md text-[#e4efff]">
              <CircleDashed className="w-3.5 h-3.5" />
              Indicators
            </button>
            <button className="flex items-center gap-1 bg-[#1d2434] px-2 py-1 rounded-md text-[#e4efff]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#f87171]" />
              MARKET CLOSED
            </button>
          </div>
        </div>

        <div className="mx-3 mt-2 flex h-[720px] rounded-[24px] overflow-hidden border border-[#1a293a] bg-[#0e1d2f]">
          <aside className="w-[318px] border-r border-[#24354d] bg-[#101d2d] p-4">
            <div className="flex items-center justify-between text-[#dfeaf6] mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#0d253d] text-[#5fa9ff] font-bold">30</span>
                <div>
                  <div className="text-[11px] text-[#9ab2d2]">US30 • DJI</div>
                  <div className="text-[9px] text-[#6b7f9d]">Dow Jones (Spot *DJI)</div>
                </div>
              </div>
              <button className="text-[#9ab2d2] text-xl">×</button>
            </div>

            <div className="mb-4">
              <div className="text-[22px] font-bold text-[#f8f8ff]">{latestClose.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-[#f2f4fb]">USD</span></div>
              <div className="mt-1 flex items-center gap-2 text-[13px] font-medium text-[#ef5353]">
                <span className="text-lg">↘</span>
                <span>{delta.toFixed(2)} ({percent.toFixed(2)}%)</span>
                <span className="text-[#9aaec8]">AT CLOSE / LIVE</span>
              </div>
            </div>

            <div className="flex gap-2 text-[10px] font-medium border-b border-[#24334c] pb-2 mb-3">
              {['Overview', 'Key Stats', 'Seasons'].map((tab, idx) => (
                <button key={tab} className={`px-2 py-1.5 rounded ${idx === 0 ? 'bg-[#1d2f46] text-white border border-[#304d75]' : 'text-[#89a0c6]'}`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="bg-[#162232] border border-[#24364d] rounded-xl p-3 mb-3">
              <div className="text-[10px] font-medium text-[#7d90ae] uppercase tracking-wider mb-2">Description</div>
              <p className="text-[11px] leading-5 text-[#dfe7f8]">
                This asset represents the high-frequency trading stream for Dow Jones (Spot *DJI), sourced via live prices from Yahoo Finance. Our smart terminal computes order blocks, gaps, and sessions instantly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-[#162232] border border-[#24364d] rounded-xl p-2">
                <div className="text-[10px] text-[#7d90ae] uppercase">Day high</div>
                <div className="mt-1 text-[14px] font-bold text-[#50d4a6]">51723.62</div>
              </div>
              <div className="bg-[#162232] border border-[#24364d] rounded-xl p-2">
                <div className="text-[10px] text-[#7d90ae] uppercase">Day low</div>
                <div className="mt-1 text-[14px] font-bold text-[#f08d96]">51660.83</div>
              </div>
            </div>

            <div className="bg-[#162232] border border-[#24364d] rounded-xl p-3">
              <div className="text-[10px] font-medium text-[#7d90ae] uppercase tracking-wider mb-2">Quick swapper</div>
              <div className="space-y-2 text-[12px] font-medium">
                {['US30', 'NQ-F', 'GC=F'].map((symbol, index) => (
                  <button
                    key={symbol}
                    onClick={() => setSelectedSymbol(symbol)}
                    className={`w-full text-left px-3 py-2 rounded-lg border ${selectedSymbol === symbol ? 'border-[#3c73ff] bg-[#1c2d48] text-white' : 'border-transparent bg-[#111d2d] text-[#d1dff8]'}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${index === 0 ? 'bg-[#3b82f6]' : index === 1 ? 'bg-[#f59e0b]' : 'bg-[#f87171]'}`} />
                      {symbol}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1 relative bg-[#0d1829]">
            <div className="px-4 py-3 flex items-center justify-between border-b border-[#213247] text-[12px] text-[#dfeaf6]">
              <div className="flex items-center gap-2">
                <span className="text-[#a6b7d9]">US30 • DJI</span>
                <span className="text-[#eaf5ff] font-semibold">BT Morgan</span>
              </div>
              <div className="flex items-center gap-2 text-[#d2dffb]">
                <span className="bg-[#1e2c40] px-1.5 py-0.5 rounded text-[10px]">● Trading Sessions</span>
                <span className="bg-[#1e2c40] px-1.5 py-0.5 rounded text-[10px]">● Volume</span>
              </div>
            </div>

            <div className="relative h-[600px]">
              <div className="absolute inset-0">
                <canvas ref={canvasRef} onMouseMove={handleMouseMove} onWheel={handleWheel} className="w-full h-full block" />
              </div>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 bottom-16 flex items-center justify-center gap-3 text-[#a6b7d9] text-[10px]">
              <span>16:00</span>
              <span>18</span>
              <span>18:00</span>
            </div>

            <div className="absolute right-5 bottom-10 bg-[#1a2a3f] border border-[#2d4265] rounded-xl px-3 py-2 flex items-center gap-2 text-sm text-[#dfeaf6] shadow-lg">
              <span className="inline-block w-2 h-2 rounded-full bg-[#60a5fa]" />
              <span className="font-semibold">BT Morgan AI</span>
            </div>
          </main>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#0d1727] border-t border-[#1d2b3d] flex items-center justify-around px-4 text-[#a5b4cd]">
          <button className="flex flex-col items-center gap-1 text-white">
            <span className="text-xl font-bold">☰</span>
            <span className="text-[10px]">Chat</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <span className="text-xl">◉</span>
            <span className="text-[10px]">Preview</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <span className="text-xl">⇄</span>
            <span className="text-[10px]">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
