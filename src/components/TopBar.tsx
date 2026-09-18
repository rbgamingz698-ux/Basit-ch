import React, { useState } from 'react';
import {
  BarChart2,
  ChevronDown,
  Check,
  Calendar,
  RefreshCw,
  Palette,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { CandleColorTheme, ChartType, Timeframe } from '../types/chart';
import { getSymbolInfo } from '../services/marketData';

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
  isNewsOpen: boolean;
  onToggleNews: () => void;
  futureNewsCount: number;
  onRefreshData: () => void;
  isLoadingData: boolean;
  dataSource?: string;
  cacheSecondsLeft: number;
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
  isNewsOpen,
  onToggleNews,
  futureNewsCount,
  onRefreshData,
  isLoadingData,
  dataSource = 'Yahoo Finance',
  cacheSecondsLeft,
}) => {
  const [showChartTypesMenu, setShowChartTypesMenu] = useState(false);

  const symbolInfo = getSymbolInfo(symbol);
  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1H', '1D'];
  const chartTypes: ChartType[] = ['Candlestick', 'Line', 'Area', 'Bar', 'Heikin-Ashi'];

  const isPositive = priceChange >= 0;

  return (
    <header 
      id="top-bar"
      className="h-14 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between px-4 text-xs select-none z-30 shrink-0 shadow-sm"
    >
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-2">
        
        {/* 1. SYMBOL SWITCHER: US30 vs NASDAQ (^DJI vs ^IXIC) */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-[#1e222d] p-1 rounded-xl border border-[#2a2e39] shadow-inner">
            {/* US30 Switcher Button */}
            <button
              id="switcher-btn-us30"
              onClick={() => onSelectSymbol('US30')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                symbol === 'US30'
                  ? 'bg-[#2962FF] text-white shadow-md font-extrabold'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
              }`}
              title="Switch to US30 (Dow Jones ^DJI)"
            >
              <span className="tracking-wide">US30</span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-mono font-normal ${
                symbol === 'US30' ? 'bg-black/30 text-blue-100' : 'text-[#787b86]'
              }`}>
                ^DJI
              </span>
            </button>

            {/* NASDAQ Switcher Button */}
            <button
              id="switcher-btn-nasdaq"
              onClick={() => onSelectSymbol('NASDAQ')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                symbol === 'NASDAQ'
                  ? 'bg-[#2962FF] text-white shadow-md font-extrabold'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
              }`}
              title="Switch to NASDAQ (US100 ^IXIC)"
            >
              <span className="tracking-wide">NASDAQ</span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-mono font-normal ${
                symbol === 'NASDAQ' ? 'bg-black/30 text-blue-100' : 'text-[#787b86]'
              }`}>
                US100
              </span>
            </button>
          </div>

          {/* Real-time Price Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] font-mono text-xs">
            <span className="font-bold text-white tracking-tight text-sm">
              {lastPrice > 0 ? lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
            </span>
            <span
              style={{ color: isPositive ? candleTheme.upColor : candleTheme.downColor }}
              className="text-[11px] font-semibold flex items-center gap-0.5"
            >
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 2. DYNAMIC TIMEFRAME SWITCHER (1m <-> 5m) & CHART CONTROLS */}
        <div className="hidden md:flex items-center gap-2">
          {/* Segmented 1m / 5m Selector */}
          <div className="flex items-center bg-[#1e222d] p-0.5 rounded-lg border border-[#2a2e39] shadow-xs font-mono">
            <button
              id="timeframe-btn-1m"
              onClick={() => onChangeTimeframe('1m')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                timeframe === '1m'
                  ? 'bg-[#2962FF] text-white shadow-xs'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
              }`}
              title="Switch to 1-Minute Candles"
            >
              <span>1m</span>
            </button>
            <button
              id="timeframe-btn-5m"
              onClick={() => onChangeTimeframe('5m')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                timeframe === '5m'
                  ? 'bg-[#2962FF] text-white shadow-xs'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
              }`}
              title="Switch to 5-Minute Candles"
            >
              <span>5m</span>
            </button>
          </div>

          {/* Dynamic Switch Timeframe Button (Toggles between 1m and 5m) */}
          <button
            id="dynamic-timeframe-switch-btn"
            onClick={() => onChangeTimeframe(timeframe === '1m' ? '5m' : '1m')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#d1d4dc] hover:text-white transition-all border border-[#2a2e39] text-xs font-semibold cursor-pointer shadow-xs group"
            title={`Switch to ${timeframe === '1m' ? '5m' : '1m'} candles`}
          >
            <Clock className="w-3.5 h-3.5 text-[#2962FF]" />
            <span>Switch to <strong className="text-white font-mono">{timeframe === '1m' ? '5m' : '1m'}</strong></span>
          </button>

          <div className="h-5 w-px bg-[#2a2e39]" />

          {/* Dedicated PKT 5:30 UTC Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-[11px] font-mono shadow-xs">
            <span className="text-[#2962FF] font-bold">PKT</span>
            <span className="text-[#d1d4dc] font-semibold">5:30 UTC</span>
          </div>

          <div className="h-5 w-px bg-[#2a2e39]" />

          {/* Chart Style (Candlestick, Line, Area, etc.) */}
          <div className="relative">
            <button
              id="chart-type-dropdown-btn"
              onClick={() => setShowChartTypesMenu(!showChartTypesMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#d1d4dc] transition-colors border border-[#2a2e39] cursor-pointer shadow-xs"
            >
              <BarChart2 className="w-3.5 h-3.5 text-[#2962FF]" />
              <span className="font-medium text-xs">{chartType}</span>
              <ChevronDown className="w-3 h-3 text-[#787b86]" />
            </button>

            {showChartTypesMenu && (
              <div className="absolute left-0 mt-1.5 w-44 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in duration-100">
                {chartTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      onChangeChartType(type);
                      setShowChartTypesMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-[#2a2e39] cursor-pointer transition-colors ${
                      chartType === type ? 'text-[#2962FF] bg-[#2962FF]/10' : 'text-[#d1d4dc]'
                    }`}
                  >
                    <span>{type}</span>
                    {chartType === type && <Check className="w-3.5 h-3.5 text-[#2962FF]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-[#2a2e39]" />

          {/* Candle Colors Theme Modal Trigger */}
          <button
            id="candle-color-btn"
            onClick={onOpenCandleColorModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#d1d4dc] hover:text-white transition-colors border border-[#2a2e39] cursor-pointer shadow-xs group"
            title="Customize Candle Colors"
          >
            <Palette className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span className="font-medium text-xs">Candle Colors</span>
            <div className="flex items-center gap-1 ml-0.5">
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/30"
                style={{ backgroundColor: candleTheme.upColor }}
              />
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/30"
                style={{ backgroundColor: candleTheme.downColor }}
              />
            </div>
          </button>
        </div>

        {/* 3. YAHOO FINANCE DATA FEED STATUS, 60S CACHE TIMER & NEWS TOGGLE */}
        <div className="flex items-center gap-2">
          {/* Yahoo Finance 60s Cache Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-[11px] font-mono" title="Yahoo Finance v8 API (Cached 60s)">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold hidden sm:inline">Yahoo Finance</span>
            <span className="text-[#787b86]">({cacheSecondsLeft}s)</span>
          </div>

          {/* Manual Refresh */}
          <button
            id="refresh-feed-btn"
            onClick={onRefreshData}
            disabled={isLoadingData}
            className="p-2 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-colors cursor-pointer"
            title="Refresh Yahoo Finance 5m Candles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin text-[#2962FF]' : ''}`} />
          </button>

          <div className="h-5 w-px bg-[#2a2e39]" />

          {/* Future USD Economic News Radar Toggle */}
          <button
            id="toggle-news-btn"
            onClick={onToggleNews}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
              isNewsOpen
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-xs'
                : 'bg-[#1e222d] text-[#787b86] hover:text-white border-[#2a2e39]'
            }`}
            title="Toggle Future Economic News Radar"
          >
            <Calendar className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Upcoming News</span>
            {futureNewsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold">
                {futureNewsCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
