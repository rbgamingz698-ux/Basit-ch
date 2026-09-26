import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  X,
  Newspaper,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Target
} from 'lucide-react';
import { CandleData } from '../types/chart';
import { getSymbolInfo, SUPPORTED_SYMBOLS } from '../services/marketData';
import { StocksNewsPanel } from './StocksNewsPanel';
import { EconomicCalendarPanel } from './EconomicCalendarPanel';
import { PriceAlertsPanel } from './PriceAlertsPanel';

export type LeftPanelTab = 'overview' | 'news' | 'calendar';

interface StockDetailPanelProps {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  candles: CandleData[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectSymbol: (sym: string) => void;
  onNewNews?: (item: any) => void;
  activeTab?: LeftPanelTab;
  onTabChange?: (tab: LeftPanelTab) => void;
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
  activeTab: controlledActiveTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<LeftPanelTab>('overview');
  const activeTab = controlledActiveTab ?? internalTab;

  const setActiveTab = (tab: LeftPanelTab) => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

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
        className="w-12 bg-[#131722] border-r border-[#2a2e39] flex flex-col items-center py-3 select-none shrink-0 z-20 justify-between"
      >
        <div className="flex flex-col items-center">
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-all flex items-center justify-center border border-[#2a2e39] cursor-pointer"
            title="Expand Left Panel"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>

          <div className="mt-5 flex flex-col items-center gap-3">
            {/* Overview button with circular badge */}
            <button
              onClick={() => { onToggleCollapse(); setActiveTab('overview'); }}
              className={`w-8 h-8 rounded-full ${circularBadge.bg} ${circularBadge.textCol} flex items-center justify-center text-xs font-black shadow-md transition-transform hover:scale-110 cursor-pointer ${
                activeTab === 'overview' ? 'ring-2 ring-white/60' : 'opacity-80 hover:opacity-100'
              }`}
              title={`${symbolInfo.symbol} Overview & Stats`}
            >
              {circularBadge.text}
            </button>

            {/* Stocks News icon */}
            <button
              onClick={() => { onToggleCollapse(); setActiveTab('news'); }}
              className={`p-2 rounded-lg transition-colors relative cursor-pointer ${
                activeTab === 'news'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-[#787b86] hover:text-amber-400 hover:bg-[#1e222d]'
              }`}
              title="Stocks & Market News Feed"
            >
              <Newspaper className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
            </button>

            {/* Economic Calendar icon */}
            <button
              onClick={() => { onToggleCollapse(); setActiveTab('calendar'); }}
              className={`p-2 rounded-lg transition-colors relative cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-[#787b86] hover:text-rose-400 hover:bg-[#1e222d]'
              }`}
              title="Upcoming Economic Calendar"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Jump to Live Price Button at bottom of collapsed sidebar */}
        <div className="pb-1">
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('jump-to-live'));
            }}
            className="w-9 h-9 rounded-lg bg-[#1e222d] hover:bg-[#2962FF] text-[#2962FF] hover:text-white transition-all flex items-center justify-center border border-[#2a2e39] hover:border-[#2962FF] cursor-pointer shadow-md group"
            title="Jump to Live Price"
          >
            <Target className="w-4 h-4 group-hover:animate-pulse" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside 
       id="stock-detail-panel"
       className="w-80 md:w-92 bg-[#131722] border-r border-[#2a2e39] flex flex-col h-full select-none shrink-0 relative"
    >
      {/* 1. Brand Header */}
      <div className="p-3 border-b border-[#2a2e39]/60 flex items-center justify-between bg-[#131722] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full ${circularBadge.bg} ${circularBadge.textCol} flex items-center justify-center text-xs font-black shadow-md border border-white/10`}>
            {circularBadge.text}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-xs">{symbolInfo.symbol}</span>
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
          className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-rose-900/20 text-[#787b86] hover:text-rose-400 transition-colors border border-[#2a2e39] cursor-pointer"
          title="Minimize Left Panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* 2. LIVE PRICE HERO CONTAINER */}
      <div className="px-4 py-3 bg-[#131722] space-y-1 border-b border-[#2a2e39]/40 shrink-0">
        <div className="text-2xl font-extrabold text-white tracking-tight font-mono flex items-baseline gap-1">
          {lastPrice.toFixed(symbolInfo.precision)}
          <span className="text-xs text-[#787b86] font-normal font-sans">USD</span>
        </div>
        
        {/* Growth/Down Live Stats Badge */}
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-extrabold flex items-center gap-1 font-mono px-2 py-0.5 rounded ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {priceChange.toFixed(symbolInfo.precision)} ({changePercent.toFixed(2)}%)
          </span>
          <span className="text-[10px] text-[#787b86] font-medium font-mono uppercase">Live Data</span>
        </div>
      </div>

      {/* 3. DETAILS SECTION TABS (Overview, Stocks News, Calendar) */}
      <div className="flex border-b border-[#2a2e39] text-xs font-bold px-2 bg-[#131722] shrink-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 text-center transition-colors relative border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#2962FF] text-white font-bold'
              : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('news')}
          className={`flex-1 py-2 text-center transition-colors relative border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'news'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          <Newspaper className="w-3.5 h-3.5" />
          <span>Stocks News</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-2 text-center transition-colors relative border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'calendar'
              ? 'border-rose-500 text-rose-400 font-bold'
              : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Calendar</span>
        </button>
      </div>

      {/* 4. TABS INNER CONTENT */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-5">
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-3.5 space-y-2">
              <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Description</span>
                <span className="text-[9px] text-[#2962FF] font-mono">Live Proxy</span>
              </div>
              <p className="text-xs text-[#b2b5be] leading-relaxed">
                Live stream for <b>{symbolInfo.displayName}</b> ({symbolInfo.symbol}), sourced via Yahoo Finance v8. Our terminal computes real-time High-Frequency Sessions, Order Blocks, and Liquidity Zones.
              </p>
            </div>

            {/* Quick overview metric pills */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1e222d]/70 border border-[#2a2e39] p-3 rounded-xl text-center">
                <span className="text-[10px] text-[#787b86] block font-mono">DAY HIGH</span>
                <span className="text-sm font-bold text-emerald-400 font-mono mt-1 block">
                  {metrics.high.toFixed(symbolInfo.precision)}
                </span>
              </div>
              <div className="bg-[#1e222d]/70 border border-[#2a2e39] p-3 rounded-xl text-center">
                <span className="text-[10px] text-[#787b86] block font-mono">DAY LOW</span>
                <span className="text-sm font-bold text-rose-400 font-mono mt-1 block">
                  {metrics.low.toFixed(symbolInfo.precision)}
                </span>
              </div>
            </div>



            {/* Key Data Points */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-white uppercase tracking-wider px-1">Key Data Points</div>
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-1 divide-y divide-[#2a2e39]/60 text-xs">
                {[
                  { label: 'Volume', value: metrics.volume },
                  { label: 'Previous Close', value: `${metrics.prevClose.toFixed(symbolInfo.precision)} USD` },
                  { label: 'Open Price', value: `${metrics.open.toFixed(symbolInfo.precision)} USD` },
                  { label: 'Day High', value: `${metrics.high.toFixed(symbolInfo.precision)} USD`, color: 'text-emerald-400' },
                  { label: 'Day Low', value: `${metrics.low.toFixed(symbolInfo.precision)} USD`, color: 'text-rose-400' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-[#b2b5be] font-medium">{stat.label}</span>
                    <span className={`font-mono font-bold ${stat.color || 'text-white'}`}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* STOCKS NEWS TAB */}
        {activeTab === 'news' && (
          <StocksNewsPanel
            currentSymbol={symbol}
            onSelectSymbol={onSelectSymbol}
            onNewNews={onNewNews}
            showHeader={false}
          />
        )}

        {/* ECONOMIC CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <EconomicCalendarPanel
            showHeader={false}
          />
        )}
      </div>
    </aside>
  );
};


