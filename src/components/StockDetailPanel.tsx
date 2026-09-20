import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  X
} from 'lucide-react';
import { CandleData, NewsCategory } from '../types/chart';
import { getSymbolInfo, SUPPORTED_SYMBOLS } from '../services/marketData';
import { NewsFeed } from './NewsFeed';

interface StockDetailPanelProps {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  candles: CandleData[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectSymbol: (sym: string) => void;
  onNewNews?: (item: any) => void;
}

export const StockDetailPanel: React.FC<StockDetailPanelProps> = ({
  symbol,
  lastPrice,
  priceChange,
  candles,
  isCollapsed,
  onToggleCollapse,
  onSelectSymbol,
  onNewNews,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stats'>('overview');

  const symbolInfo = useMemo(() => getSymbolInfo(symbol), [symbol]);

  // Compute key metrics dynamically from candle history or default props
  const metrics = useMemo(() => {
    if (!candles || candles.length === 0) {
      return {
        open: symbolInfo.basePrice,
        high: symbolInfo.basePrice * 1.005,
        low: symbolInfo.basePrice * 0.995,
        prevClose: symbolInfo.basePrice * 0.999,
        volume: '150.2K',
      };
    }

    const todayCandles = candles.slice(-50); // Use recent candles for day metrics
    const open = todayCandles[0]?.open || lastPrice;
    const high = Math.max(...todayCandles.map(c => c.high), lastPrice);
    const low = Math.min(...todayCandles.map(c => c.low), lastPrice);
    const prevClose = candles[candles.length - 2]?.close || open;
    
    // Sum volumes
    const totalVol = todayCandles.reduce((acc, c) => acc + (c.volume || 100), 0);
    const formattedVol = totalVol > 1000000 
      ? `${(totalVol / 1000000).toFixed(2)} M` 
      : `${(totalVol / 1000).toFixed(2)} K`;

    return {
      open,
      high,
      low,
      prevClose,
      volume: formattedVol,
    };
  }, [candles, symbolInfo, lastPrice]);

  const changePercent = useMemo(() => {
    const prev = metrics.prevClose || lastPrice;
    if (prev === 0) return 0;
    return (priceChange / prev) * 100;
  }, [priceChange, metrics.prevClose, lastPrice]);

  const isPositive = priceChange >= 0;

  // Get circular badge characters & style (like 30, 100, GC etc. from screenshot)
  const circularBadge = useMemo(() => {
    if (symbol.includes('30')) return { text: '30', bg: 'bg-[#FF9100]', textCol: 'text-white' };
    if (symbol.includes('100') || symbol.includes('NASDAQ')) return { text: '100', bg: 'bg-[#00B0FF]', textCol: 'text-white' };
    if (symbol.includes('GC') || symbol.includes('GOLD')) return { text: 'AU', bg: 'bg-amber-400', textCol: 'text-black font-black' };
    return { text: symbol.substring(0, 2).toUpperCase(), bg: 'bg-[#2962FF]', textCol: 'text-white' };
  }, [symbol]);

  if (isCollapsed) {
    return (
      <aside 
        id="stock-detail-panel-collapsed"
        className="w-12 bg-[#131722] border-r border-[#2a2e39] flex flex-col items-center py-4 select-none shrink-0"
      >
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-full bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-all flex items-center justify-center border border-[#2a2e39]"
          title="Expand Stock Overview Panel"
        >
          <Layers className="w-4 h-4 text-[#2962FF]" />
        </button>

        <div className="mt-8 flex flex-col items-center gap-6">
          <div className={`w-8 h-8 rounded-full ${circularBadge.bg} ${circularBadge.textCol} flex items-center justify-center text-xs font-black shadow-lg`}>
            {circularBadge.text}
          </div>
          <div className="rotate-90 text-[10px] font-bold text-[#787b86] tracking-widest uppercase origin-left ml-4 mt-8 whitespace-nowrap">
            {symbolInfo.symbol} OVERVIEW
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside 
       id="stock-detail-panel"
       className="w-80 md:w-88 bg-[#131722] border-r border-[#2a2e39] flex flex-col h-full select-none shrink-0 overflow-y-auto no-scrollbar relative"
    >
      {/* 1. Brand Header */}
      <div className="p-4 border-b border-[#2a2e39]/50 flex items-center justify-between bg-[#131722]">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full ${circularBadge.bg} ${circularBadge.textCol} flex items-center justify-center text-xs font-black shadow-md border border-white/10`}>
            {circularBadge.text}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-sm">{symbolInfo.symbol}</span>
              <span className="w-1 h-1 rounded-full bg-[#787b86]" />
              <span className="text-[10px] text-[#787b86] font-mono font-medium">{symbolInfo.exchange}</span>
            </div>
            <div className="text-[10px] text-[#787b86] max-w-[170px] truncate font-medium">
              {symbolInfo.displayName}
            </div>
          </div>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-rose-900/20 text-[#787b86] hover:text-rose-400 transition-colors border border-[#2a2e39]"
          title="Minimize Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. LIVE PRICE HERO CONTAINER */}
      <div className="p-4 bg-[#131722] space-y-1">
        <div className="text-3xl font-extrabold text-white tracking-tight font-mono flex items-baseline gap-1">
          {lastPrice.toFixed(symbolInfo.precision)}
          <span className="text-xs text-[#787b86] font-normal font-sans">USD</span>
        </div>
        
        {/* Growth/Down Live Stats Badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-extrabold flex items-center gap-1 font-mono px-2 py-0.5 rounded ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {priceChange.toFixed(symbolInfo.precision)} ({changePercent.toFixed(2)}%)
          </span>
          <span className="text-[10px] text-[#787b86] font-medium font-mono uppercase">At Close / Live</span>
        </div>
      </div>

      {/* 4. DETAILS SECTION TABS (Overview, Key Stats) */}
      <div className="flex border-b border-[#2a2e39] text-xs font-bold px-4 bg-[#131722] sticky top-0 z-10 shrink-0">
        {(['overview', 'stats'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-center transition-colors relative border-b-2 capitalize ${
              activeTab === tab
                ? 'border-[#2962FF] text-white'
                : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            {tab === 'stats' ? 'Key Stats' : tab}
          </button>
        ))}
      </div>

      {/* 5. TABS INNER WINDOW CONTENT */}
      <div className="flex-1 p-4 space-y-4">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-4 space-y-3">
              <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Description</span>
                <span className="text-[9px] text-[#2962FF] font-mono">Live Data</span>
              </div>
              <p className="text-xs text-[#b2b5be] leading-relaxed">
                High-frequency trading stream for <b>{symbolInfo.displayName}</b>, sourced via live proxies from Yahoo Finance. Our terminal computes Order Blocks, Gaps, and Sessions instantly.
              </p>
            </div>

            {/* Quick overview metric pills */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1e222d]/50 border border-[#2a2e39]/60 p-3 rounded-xl text-center">
                <span className="text-[10px] text-[#787b86] block font-mono">DAY HIGH</span>
                <span className="text-sm font-bold text-emerald-400 font-mono mt-1 block">
                  {metrics.high.toFixed(symbolInfo.precision)}
                </span>
              </div>
              <div className="bg-[#1e222d]/50 border border-[#2a2e39]/60 p-3 rounded-xl text-center">
                <span className="text-[10px] text-[#787b86] block font-mono">DAY LOW</span>
                <span className="text-sm font-bold text-rose-400 font-mono mt-1 block">
                  {metrics.low.toFixed(symbolInfo.precision)}
                </span>
              </div>
            </div>

            {/* News Section */}
            <div className="space-y-3 border-t border-[#2a2e39] pt-4">
              <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Market News</span>
              </div>
              <NewsFeed onNewNews={onNewNews} />
            </div>

            {/* Quick Swapper */}
            <div className="space-y-3 border-t border-[#2a2e39] pt-4">
              <div className="text-[11px] font-bold text-white uppercase tracking-wider">Quick Swapper</div>
              <div className="space-y-2">
                {SUPPORTED_SYMBOLS.slice(0, 3).map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => onSelectSymbol(s.symbol)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between text-xs cursor-pointer ${
                      s.symbol === symbol
                        ? 'bg-[#2962FF]/10 border-[#2962FF] text-white'
                        : 'bg-[#1e222d] border-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
                    }`}
                  >
                    <span className="font-bold text-[11px]">{s.symbol}</span>
                    <span className="font-mono text-[10px] text-[#787b86]">{s.exchange}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* KEY STATS TAB */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="text-[11px] font-bold text-white uppercase tracking-wider">Key Data Points</div>
            
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-1 divide-y divide-[#2a2e39]/60 text-xs">
              {[
                { label: 'Volume', value: metrics.volume },
                { label: 'Previous Close', value: `${metrics.prevClose.toFixed(symbolInfo.precision)} USD` },
                { label: 'Open Price', value: `${metrics.open.toFixed(symbolInfo.precision)} USD` },
                { label: 'Day Range High', value: `${metrics.high.toFixed(symbolInfo.precision)} USD`, color: 'text-emerald-400' },
                { label: 'Day Range Low', value: `${metrics.low.toFixed(symbolInfo.precision)} USD`, color: 'text-rose-400' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-3">
                  <span className="text-[#b2b5be] font-medium">{stat.label}</span>
                  <span className={`font-mono font-bold ${stat.color || 'text-white'}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

