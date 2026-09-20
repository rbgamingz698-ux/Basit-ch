import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BarChart2, Clock, Crosshair, Eraser, MousePointer2, Trash2 } from 'lucide-react';


const ASSETS: Asset[] = [
  { symbol: 'GC=F', name: 'Gold Futures (Comex)', basePrice: 2580, decimals: 1 },
  { symbol: 'NQ=F', name: 'NASDAQ 100 Futures', basePrice: 19850, decimals: 0 },
  { symbol: 'YM=F', name: 'Dow Jones Mini Futures', basePrice: 41800, decimals: 0 },
];

function generateSyntheticHistory(symbol: string, timeframe: string, count = 500): Candle[] {
  const asset = ASSETS.find(item => item.symbol === symbol) ?? ASSETS[0];
  const spacing = timeframe === '1m' ? 60 : timeframe === '15m' ? 900 : timeframe === '1H' ? 3600 : timeframe === '4H' ? 14400 : 300;
  let price = asset.basePrice;
  let seed = symbol.length + timeframe.length;
  const random = () => { const value = Math.sin(seed++) * 10000; return value - Math.floor(value); };
  return Array.from({ length: count }, (_, index) => {
    const time = Math.floor(Date.now() / 1000) - (count - index) * spacing;
    const open = price;
    const close = price * (1 + (random() - 0.49) * 0.002);
    const high = Math.max(open, close) * (1 + random() * 0.0008);
    const low = Math.min(open, close) * (1 - random() * 0.0008);
    price = close;
    return { time, open, close, high, low, volume: 400 + random() * 1400 };
  });
}

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('GC=F');
  const [timeframe, setTimeframe] = useState('5m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100 });
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; price: number } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const asset = useMemo(() => ASSETS.find(item => item.symbol === selectedSymbol) ?? ASSETS[0], [selectedSymbol]);

  useEffect(() => {
    const data = generateSyntheticHistory(selectedSymbol, timeframe);
    setCandles(data);
    const visible = data.slice(-120);
    const min = Math.min(...visible.map(item => item.low));
    const max = Math.max(...visible.map(item => item.high));
    const padding = (max - min) * 0.12 || 10;
    setPriceRange({ min: min - padding, max: max + padding });
    setSelection(null);
  }, [selectedSymbol, timeframe]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.scale(dpr, dpr);
    const width = rect.width, height = rect.height, axis = 64, chartWidth = width - axis, bottom = 28, chartHeight = height - bottom;
    ctx.fillStyle = '#131722'; ctx.fillRect(0, 0, width, height);
    const min = priceRange.min, max = priceRange.max;
    const priceToY = (price: number) => chartHeight - ((price - min) / (max - min || 1)) * chartHeight;
    const step = (max - min) / 9;
    ctx.font = '10px monospace';
    for (let i = 0; i <= 9; i++) {
      const price = min + step * i, y = priceToY(price);
      ctx.strokeStyle = '#242936'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartWidth, y); ctx.stroke();
      ctx.fillStyle = '#8290a4'; ctx.fillText(price.toFixed(asset.decimals), chartWidth + 6, y + 3);
    }
    for (let i = 0; i <= 8; i++) { const x = chartWidth * i / 8; ctx.strokeStyle = '#202531'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, chartHeight); ctx.stroke(); }
    const startIndex = Math.max(0, candles.length - 120), visible = candles.slice(startIndex);
    const candleWidth = Math.max(2, chartWidth / visible.length * 0.72);
    const indexToX = (index: number) => (index - startIndex + 0.5) * chartWidth / Math.max(visible.length, 1);
    visible.forEach((candle, index) => {
      const x = indexToX(startIndex + index), openY = priceToY(candle.open), closeY = priceToY(candle.close);
      const color = candle.close >= candle.open ? '#26a69a' : '#ef5350';
      ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(x, priceToY(candle.high)); ctx.lineTo(x, priceToY(candle.low)); ctx.stroke();
      ctx.fillStyle = color; ctx.fillRect(x - candleWidth / 2, Math.min(openY, closeY), candleWidth, Math.max(1, Math.abs(openY - closeY)));
    });
    if (selection) {
      const left = Math.min(selection.start, selection.end), right = Math.max(selection.start, selection.end);
      ctx.fillStyle = 'rgba(41, 98, 255, 0.10)'; ctx.fillRect(left, 0, right - left, chartHeight);
      ctx.strokeStyle = '#2962ff'; ctx.setLineDash([5, 4]); ctx.strokeRect(left, 0, right - left, chartHeight); ctx.setLineDash([]);
      const selected = visible.filter((_, index) => { const x = indexToX(startIndex + index); return x >= left && x <= right; });
      if (selected.length > 1) {
        const bins = 24, volumes = Array.from({ length: bins }, () => 0);
        selected.forEach(candle => { const center = (candle.high + candle.low) / 2; const bin = Math.max(0, Math.min(bins - 1, Math.floor((center - min) / (max - min || 1) * bins))); volumes[bin] += candle.volume; });
        const maxVolume = Math.max(...volumes, 1), profileWidth = Math.min(150, Math.max(80, width * 0.18));
        volumes.forEach((volume, bin) => { const y = chartHeight - ((bin + 1) / bins) * chartHeight; const barHeight = chartHeight / bins - 1; ctx.fillStyle = 'rgba(201, 155, 37, 0.62)'; ctx.fillRect(chartWidth - profileWidth, y, profileWidth * volume / maxVolume, barHeight); });
        const poc = volumes.indexOf(Math.max(...volumes)); const pocY = chartHeight - ((poc + 0.5) / bins) * chartHeight; ctx.strokeStyle = '#ef5350'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(chartWidth - profileWidth, pocY); ctx.lineTo(chartWidth, pocY); ctx.stroke();
      }
    }
    if (crosshair) { ctx.strokeStyle = '#8b96a8'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(crosshair.x, 0); ctx.lineTo(crosshair.x, chartHeight); ctx.moveTo(0, crosshair.y); ctx.lineTo(chartWidth, crosshair.y); ctx.stroke(); ctx.setLineDash([]); }
  }, [asset, candles, crosshair, priceRange, selection]);

  useEffect(() => { draw(); window.addEventListener('resize', draw); return () => window.removeEventListener('resize', draw); }, [draw]);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: Math.max(0, Math.min(rect.width - 64, event.clientX - rect.left)), y: Math.max(0, Math.min(rect.height - 28, event.clientY - rect.top)) }; };
  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing) return; const p = point(event); event.currentTarget.setPointerCapture(event.pointerId); setSelection({ start: p.x, end: p.x }); };
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => { const p = point(event); const ratio = 1 - p.y / Math.max(1, event.currentTarget.clientHeight - 28); setCrosshair({ x: p.x, y: p.y, price: priceRange.min + ratio * (priceRange.max - priceRange.min) }); if (drawing && selection && event.currentTarget.hasPointerCapture(event.pointerId)) setSelection({ ...selection, end: p.x }); };
  const stopDrawing = () => { if (drawing) setDrawing(false); };

  return <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#131722] font-sans text-[#d1d4dc] select-none">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#2a2e39] bg-[#1c2030] px-3 py-2">
      <div className="flex items-center gap-2"><div className="rounded-lg bg-[#2962ff] p-2 text-white"><BarChart2 size={18} /></div><div><h1 className="text-sm font-bold tracking-wide text-white">FRVP WORKSPACE</h1><p className="font-mono text-[10px] text-[#78869a]">Chart first · draw profiles when needed</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><label className="flex items-center rounded-md border border-[#363c4e] bg-[#24293e] px-2 py-1"><span className="mr-1.5 font-mono text-[10px] font-bold text-[#829ab1]">SYMBOL:</span><select value={selectedSymbol} onChange={event => setSelectedSymbol(event.target.value)} className="bg-transparent text-xs font-bold text-white outline-none"><option value="GC=F">GC=F (Gold Futures)</option><option value="NQ=F">NQ=F (NASDAQ)</option><option value="YM=F">YM=F (Dow Jones)</option></select></label><div className="flex rounded-md border border-[#363c4e] bg-[#24293e] p-0.5">{['1m','5m','15m','1H','4H'].map(item => <button key={item} onClick={() => setTimeframe(item)} className={`rounded px-2.5 py-1 text-xs font-semibold ${timeframe === item ? 'bg-[#2962ff] text-white' : 'text-[#85929e] hover:text-white'}`}>{item}</button>)}</div></div>
    </header>
    <div className="flex shrink-0 items-center gap-2 border-b border-[#2a2e39] bg-[#161a29] px-3 py-2"><button onClick={() => { setDrawing(!drawing); if (drawing) setSelection(null); }} className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-semibold ${drawing ? 'border-[#2962ff] bg-[#2962ff] text-white' : 'border-[#3b4354] bg-[#24293e] text-[#d1d4dc]'}`}><Crosshair size={14} />{drawing ? 'Drawing range…' : 'Manual profile'}</button><button onClick={() => setSelection(null)} className="flex items-center gap-1.5 rounded border border-[#51333b] bg-[#2b2029] px-2.5 py-1.5 text-xs font-semibold text-[#ef5350]"><Trash2 size={14} />Clear profile</button><span className="ml-auto hidden items-center gap-1.5 text-[11px] text-[#829ab1] sm:flex"><MousePointer2 size={13} />{drawing ? 'Drag across candles to calculate volume' : 'Chart is clear — no profile active'}</span></div>
    <main ref={containerRef} className="relative min-h-0 flex-1"><canvas ref={canvasRef} className={`absolute inset-0 block touch-none ${drawing ? 'cursor-crosshair' : 'cursor-default'}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} /><div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-[#3b4354] bg-[#1c2030]/90 px-3 py-2 text-[10px] text-[#829ab1]"><strong className="text-white">{selection ? 'PROFILE PREVIEW' : 'CHART VIEW'}</strong><div>{selection ? 'Selected range · volume profile visible' : 'Use Manual profile, then drag a range'}</div></div><div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-lg border border-[#ff9800]/30 bg-[#ff9800]/10 px-3 py-1.5 font-mono text-[10px] text-[#ff9800]"><Clock size={13} />Market feed active</div></main>
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-[#2a2e39] bg-[#161a29] px-3 font-mono text-[10px] text-[#829ab1]"><span className="flex items-center gap-1 text-[#26a69a]"><span className="size-1.5 animate-ping rounded-full bg-[#26a69a]" />MARKET ONLINE</span><span className="flex items-center gap-1 text-[#26a69a]"><Activity size={13} />{selectedSymbol} · {timeframe}</span></footer>
  </div>;
}

