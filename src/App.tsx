import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BarChart2, ChevronDown, CircleHelp, Maximize2, RefreshCw, Search, Sparkles, SlidersHorizontal } from 'lucide-react';

type Asset = { symbol: string; name: string; exchange: string; basePrice: number; decimals: number };
type Candle = { time: number; open: number; close: number; high: number; low: number; volume: number };

const ASSETS: Asset[] = [
  { symbol: 'US30', name: 'Dow Jones (Spot ^DJI)', exchange: 'DJI', basePrice: 51682, decimals: 2 },
  { symbol: 'GC=F', name: 'Gold Futures (Comex)', exchange: 'COMEX', basePrice: 2580, decimals: 1 },
  { symbol: 'NQ=F', name: 'NASDAQ 100 Futures', exchange: 'CME', basePrice: 19850, decimals: 0 },
];

function makeCandles(symbol: string, timeframe: string, count = 150): Candle[] {
  const asset = ASSETS.find((item) => item.symbol === symbol) ?? ASSETS[0];
  let price = asset.basePrice;
  let seed = symbol.length * 11 + timeframe.length;
  const random = () => { const value = Math.sin(seed++) * 10000; return value - Math.floor(value); };
  return Array.from({ length: count }, (_, index) => {
    const time = Math.floor(Date.now() / 1000) - (count - index) * (timeframe === '1m' ? 60 : 300);
    const open = price;
    const close = price + (random() - 0.5) * asset.basePrice * 0.003;
    const high = Math.max(open, close) + random() * asset.basePrice * 0.0012;
    const low = Math.min(open, close) - random() * asset.basePrice * 0.0012;
    price = close;
    return { time, open, close, high, low, volume: 500 + random() * 1500 };
  });
}

export default function App() {
  const [symbol, setSymbol] = useState('US30');
  const [timeframe, setTimeframe] = useState('1m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const asset = useMemo(() => ASSETS.find((item) => item.symbol === symbol) ?? ASSETS[0], [symbol]);

  useEffect(() => setCandles(makeCandles(symbol, timeframe)), [symbol, timeframe]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = chartRef.current;
    if (!canvas || !container || candles.length === 0) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width; const height = rect.height; const axis = 60; const chartWidth = width - axis; const bottom = 32; const chartHeight = height - bottom;
    ctx.fillStyle = '#11151f'; ctx.fillRect(0, 0, width, height);
    const visible = candles.slice(-120); const min = Math.min(...visible.map((c) => c.low)); const max = Math.max(...visible.map((c) => c.high)); const pad = (max - min) * 0.08 || 10; const low = min - pad; const high = max + pad;
    const y = (price: number) => chartHeight - ((price - low) / (high - low)) * chartHeight;
    ctx.font = '10px monospace';
    for (let i = 0; i <= 12; i++) { const lineY = chartHeight * i / 12; ctx.strokeStyle = '#202633'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(chartWidth, lineY); ctx.stroke(); ctx.fillStyle = '#7f899a'; ctx.fillText((high - (high - low) * i / 12).toFixed(asset.decimals), chartWidth + 7, lineY + 3); }
    for (let i = 0; i <= 7; i++) { const x = chartWidth * i / 7; ctx.strokeStyle = '#1c222d'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, chartHeight); ctx.stroke(); }
    const candleWidth = Math.max(2, (chartWidth / visible.length) * 0.62);
    visible.forEach((candle, index) => { const x = (index + 0.5) * chartWidth / visible.length; const color = candle.close >= candle.open ? '#f4f5f7' : '#ef3340'; ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y(candle.high)); ctx.lineTo(x, y(candle.low)); ctx.stroke(); ctx.fillStyle = color; ctx.fillRect(x - candleWidth / 2, Math.min(y(candle.open), y(candle.close)), candleWidth, Math.max(1, Math.abs(y(candle.open) - y(candle.close)))); });
    if (crosshair) { ctx.strokeStyle = '#c4c9d1'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(crosshair.x, 0); ctx.lineTo(crosshair.x, chartHeight); ctx.moveTo(0, crosshair.y); ctx.lineTo(chartWidth, crosshair.y); ctx.stroke(); ctx.setLineDash([]); }
  }, [asset, candles, crosshair]);

  useEffect(() => { draw(); window.addEventListener('resize', draw); return () => window.removeEventListener('resize', draw); }, [draw]);
  const handleMove = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); setCrosshair({ x: Math.min(rect.width - 60, Math.max(0, event.clientX - rect.left)), y: Math.min(rect.height - 32, Math.max(0, event.clientY - rect.top)) }); };
  const change = asset.symbol === 'US30' ? '-698.02 (-1.35%)' : '+18.42 (+0.72%)';

  return <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#11151f] font-sans text-[#d6d9e0] select-none">
    <header className="flex shrink-0 items-center gap-2 border-b border-[#272d3a] bg-[#141923] px-3 py-2">
      <label className="flex items-center gap-1.5 rounded-md border border-[#2d3545] bg-[#1b2130] px-2.5 py-1.5 text-xs"><Search size={13} className="text-[#6188ff]" /><select value={symbol} onChange={(event) => setSymbol(event.target.value)} className="max-w-[74px] bg-transparent font-semibold text-white outline-none"><option value="US30">US30</option><option value="GC=F">GC=F</option><option value="NQ=F">NQ=F</option></select><ChevronDown size={12} className="text-[#788298]" /></label>
      <div className="flex rounded-md border border-[#2d3545] bg-[#1b2130] p-0.5">{['1m', '5m', '15m', '1H', '4H', '1D'].map((item) => <button key={item} onClick={() => setTimeframe(item)} className={`rounded px-2 py-1 text-[10px] ${timeframe === item ? 'bg-[#2962ff] text-white' : 'text-[#7f899a]'}`}>{item}</button>)}</div>
      <button className="ml-auto rounded-md border border-[#2d3545] bg-[#1b2130] p-1.5 text-[#f2bf43]" aria-label="Theme"><CircleHelp size={13} /></button><button className="rounded-md border border-[#233d80] bg-[#17244c] p-1.5 text-[#6188ff]" aria-label="Indicators"><SlidersHorizontal size={13} /></button><span className="rounded-md border border-[#5b203d] bg-[#32172a] px-2 py-1 text-[10px] font-semibold text-[#ff4f88]">● MARKET CLOSED</span><button className="rounded-md border border-[#2d3545] p-1.5 text-[#788298]" aria-label="Refresh"><RefreshCw size={13} /></button>
    </header>
    <div className="flex min-h-0 flex-1">
      <aside className="w-[20%] min-w-[210px] shrink-0 overflow-y-auto border-r border-[#2d3340] bg-[#141923] p-3"><section aria-label="Market news" className="mb-4 border-b border-[#2d3340] pb-3"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9aa5b8]">News feed</span><span className="rounded bg-[#17244c] px-1.5 py-0.5 text-[9px] font-semibold text-[#6188ff]">LIVE</span></div><div className="flex flex-col gap-2"><article className="rounded-md border border-[#2c3443] bg-[#1b2130] p-2"><p className="text-[10px] font-semibold leading-4 text-white">US30 futures remain under pressure as traders watch rate expectations.</p><time className="mt-1 block text-[9px] text-[#6f7a8f]">2 min ago</time></article><article className="rounded-md border border-[#252d3b] bg-[#191f2c] p-2"><p className="text-[10px] leading-4 text-[#aeb6c4]">Dow industrials slip while volume stays light into the close.</p><time className="mt-1 block text-[9px] text-[#6f7a8f]">8 min ago</time></article><article className="rounded-md border border-[#252d3b] bg-[#191f2c] p-2"><p className="text-[10px] leading-4 text-[#aeb6c4]">Gold and Nasdaq futures mixed in early global trading.</p><time className="mt-1 block text-[9px] text-[#6f7a8f]">14 min ago</time></article></div></section><div className="flex items-center gap-2"><div className="flex size-9 items-center justify-center rounded-full bg-[#ff9800] font-bold text-[#161a22]">30</div><div><div className="text-sm font-bold text-white">{symbol} <span className="text-[10px] font-normal text-[#758096]">• {asset.exchange}</span></div><div className="text-[10px] text-[#778093]">{asset.name}</div></div></div><div className="mt-5 flex justify-end"><button className="rounded-md border border-[#2e3544] px-2 py-1 text-[#758096]" aria-label="Close panel">×</button></div><div className="mt-2 text-3xl font-semibold tracking-tight text-white">{asset.basePrice.toFixed(asset.decimals)} <span className="text-xs font-normal text-[#7d8798]">USD</span></div><div className="mt-2 inline-flex rounded border border-[#6a2143] bg-[#32172a] px-2 py-1 text-xs text-[#ff557f]">↘ {change}</div><span className="ml-2 text-[10px] text-[#7e8798]">AT CLOSE / LIVE</span><div className="mt-7 flex border-b border-[#2b3240] text-xs font-semibold"><button className="border-b-2 border-[#2962ff] px-4 pb-3 text-white">Overview</button><button className="px-4 pb-3 text-[#737d90]">Key Stats</button><button className="px-4 pb-3 text-[#737d90]">Seasonals</button></div><section className="mt-4 rounded-xl border border-[#2c3443] bg-[#1b2130] p-3"><div className="flex justify-between text-[11px] font-bold text-white">DESCRIPTION <span className="text-[#6188ff]">LIVE INFO</span></div><p className="mt-3 text-xs leading-5 text-[#747e91]">This asset represents the high-frequency trading stream for {asset.name}. Our smart terminal computes market activity and price movement in real time.</p></section><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-[#252d3b] bg-[#191f2c] p-3 text-center"><div className="text-[10px] text-[#8992a1]">DAY HIGH</div><strong className="text-sm text-[#24caa0]">{(asset.basePrice + 41.3).toFixed(asset.decimals)}</strong></div><div className="rounded-xl border border-[#252d3b] bg-[#191f2c] p-3 text-center"><div className="text-[10px] text-[#8992a1]">DAY LOW</div><strong className="text-sm text-[#ef5b72]">{(asset.basePrice - 21.7).toFixed(asset.decimals)}</strong></div></div><div className="mt-4 text-[10px] font-bold text-[#8992a1]">QUICK SWAPPER</div>{ASSETS.map((item) => <button key={item.symbol} onClick={() => setSymbol(item.symbol)} className={`mt-2 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-xs font-bold ${symbol === item.symbol ? 'border-[#2962ff] text-white' : 'border-[#2d3442] bg-[#1b2130] text-[#777f91]'}`}>{item.symbol}<span className="text-[10px] font-normal">{item.exchange}</span></button>)}</aside>
      <main ref={chartRef} className="relative min-w-0 flex-1"><canvas ref={canvasRef} className="absolute inset-0 block touch-none" onPointerMove={handleMove} onPointerLeave={() => setCrosshair(null)} /><div className="absolute left-3 top-3 rounded border border-[#614f26] bg-[#171b25]/90 px-3 py-2 text-[10px] text-[#d4b25d]"><strong className="font-serif italic">BT MORGAN</strong> <span className="text-[#8e3e42]">The Hidden Power</span></div><button className="absolute right-2 top-3 rounded border border-[#323a4a] bg-[#1b2130] p-2 text-[#8993a6]" aria-label="Fullscreen"><Maximize2 size={13} /></button><div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-[#2962ff] px-4 py-2 text-xs font-bold text-white shadow-[0_0_24px_rgba(41,98,255,0.5)]"><Sparkles size={14} />BT Morgan AI</div></main>
    </div>
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-[#292f3c] bg-[#141923] px-3 text-[10px] text-[#7e8797]"><span>BT Morgan Terminal</span><span className="flex items-center gap-1 text-[#28c9a0]"><Activity size={12} />LIVE · {symbol} · {timeframe}</span></footer>
  </div>;
}

/* Image descriptions: the provided reference shows a dark market terminal with a left asset overview panel, compact controls across the top, and a clean candlestick chart on the right without any volume profile overlay. */
