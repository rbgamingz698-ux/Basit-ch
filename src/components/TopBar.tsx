import React, { useState } from 'react';
import {
  BarChart2,
  ChevronDown,
  Check,
  RefreshCw,
  Palette,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { CandleColorTheme, ChartType, Timeframe, NewsCategory } from '../types/chart';
import { getSymbolInfo, isMarketOpen } from '../services/marketData';

interface TopBarProps {
  symbol: string;
  onSelectSymbol: (sym: string) => void;
  timeframe: Timeframe;
  onChangeTimeframe: (tf: Timeframe) => void;
  chartType: ChartType;
  onChangeChartType: (type: ChartType) => void;
  candleTheme: CandleColorTheme;
  onOpenCandleColorModal: () => void;
  lastPrice: number;
  priceChange: number;
  onRefreshData: () => void;
  isLoadingData: boolean;
  dataSource?: string;
  cacheSecondsLeft: number;
  onSelectNewsCategory: (category: NewsCategory) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  symbol,
  onSelectSymbol,
  timeframe,
  onChangeTimeframe,
  chartType,
  onChangeChartType,
  candleTheme,
  onOpenCandleColorModal,
  lastPrice,
  priceChange,
  onRefreshData,
  isLoadingData,
  dataSource = 'Yahoo Finance',
  cacheSecondsLeft,
  onSelectNewsCategory,
}) => {
  const symbolInfo = getSymbolInfo(symbol);
  const marketOpen = isMarketOpen();

  return (
    <header 
      id="top-bar"
      className="h-14 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between px-3 text-xs select-none z-30 shrink-0 shadow-sm overflow-x-auto"
    >
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-2 min-w-max">
        
        {/* 1. SYMBOL SWITCHER: US30, NASDAQ, YM=F, NQ=F */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#1e222d] p-0.5 sm:p-1 rounded-xl border border-[#2a2e39] shadow-inner">
            {[
              { label: 'US30', id: 'US30' },
              { label: 'NASDAQ', id: 'NASDAQ' },
              { label: 'US30 FUT', id: 'YM=F' },
              { label: 'NQ FUT', id: 'NQ=F' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSymbol(s.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer whitespace-nowrap ${
                  symbol === s.id
                    ? 'bg-[#2962FF] text-white shadow-md font-extrabold'
                    : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
                }`}
                title={`Switch to ${s.label}`}
              >
                <span className="tracking-wide">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. TIMEFRAME SELECTOR & THEME BUTTON */}
        <div className="flex items-center gap-2">
          {/* 1m Timeframe Badge */}
          <div className="flex items-center bg-[#1e222d] px-2.5 py-1 rounded-lg border border-[#2a2e39] shadow-xs font-mono">
            <span className="text-[10px] font-bold text-[#2962FF]">1m Chart</span>
          </div>

          <div className="h-4 w-px bg-[#2a2e39]" />

          {/* Candle Colors Theme Modal Trigger */}
          <button
            id="candle-color-btn"
            onClick={onOpenCandleColorModal}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#d1d4dc] hover:text-white transition-colors border border-[#2a2e39] cursor-pointer shadow-xs text-[10px] whitespace-nowrap"
            title="Customize Candle Colors"
          >
            <Palette className="w-3 h-3 text-amber-400" />
            <span className="font-medium hidden sm:inline">Theme</span>
          </button>
        </div>

        {/* 3. MARKET STATUS, YAHOO FINANCE DATA FEED STATUS & REFRESH */}
        <div className="flex items-center gap-2">
          {/* Market Open/Close Badge */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold ${
            marketOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>{marketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}</span>
          </div>

          {/* Yahoo Finance 60s Cache Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-[10px] font-mono" title="Yahoo Finance v8 API (Cached 60s)">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">Yahoo Finance</span>
            <span className="text-[#787b86]">({cacheSecondsLeft}s)</span>
          </div>

          {/* Manual Refresh */}
          <button
            id="refresh-feed-btn"
            onClick={onRefreshData}
            disabled={isLoadingData}
            className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-colors cursor-pointer"
            title="Refresh Yahoo Finance 5m Candles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin text-[#2962FF]' : ''}`} />
          </button>
        </div>

      </div>
    </header>
  );
};
