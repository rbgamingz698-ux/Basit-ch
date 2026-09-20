import React, { useState } from 'react';
import {
  BarChart2,
  ChevronDown,
  RefreshCw,
  Palette,
  Sliders,
  Search,
  LayoutGrid,
  Newspaper,
} from 'lucide-react';
import { CandleColorTheme, ChartType, Timeframe } from '../types/chart';
import { getSymbolInfo, isMarketOpen } from '../services/marketData';
import { Language, getTranslation } from '../utils/thaiTranslation';

interface TopBarProps {
  symbol: string;
  onSelectSymbol: (sym: string) => void;
  onOpenSymbolSearch: () => void;
  timeframe: Timeframe;
  onChangeTimeframe: (tf: Timeframe) => void;
  chartType: ChartType;
  onChangeChartType: (type: ChartType) => void;
  candleTheme: CandleColorTheme;
  onOpenCandleColorModal: () => void;
  onOpenIndicatorLibrary: () => void;
  lastPrice: number;
  priceChange: number;
  onRefreshData: () => void;
  isLoadingData: boolean;
  dataSource?: string;
  cacheSecondsLeft: number;
  language?: Language;
  onChangeLanguage?: (lang: Language) => void;
  onTriggerNewsPopup?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  symbol,
  onSelectSymbol,
  onOpenSymbolSearch,
  timeframe,
  onChangeTimeframe,
  chartType,
  onChangeChartType,
  candleTheme,
  onOpenCandleColorModal,
  onOpenIndicatorLibrary,
  lastPrice,
  priceChange,
  onRefreshData,
  isLoadingData,
  dataSource = 'Yahoo Finance',
  cacheSecondsLeft,
  language = 'EN',
  onChangeLanguage,
  onTriggerNewsPopup,
}) => {
  const symbolInfo = getSymbolInfo(symbol);
  const marketOpen = isMarketOpen();
  const t = getTranslation(language || 'EN');
  const [isChartTypeMenuOpen, setIsChartTypeMenuOpen] = useState(false);

  const chartTypes: ChartType[] = ['Candlestick', 'Bar', 'Line', 'Heikin-Ashi', 'Area', 'Baseline'];

  return (
    <header 
      id="top-bar"
      className="h-14 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between px-3 text-xs select-none z-30 shrink-0 shadow-sm overflow-x-auto"
    >
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-2 min-w-max">
        
        {/* 1. SYMBOL SWITCHER REPLACE: DYNAMIC SEARCH BUTTON */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSymbolSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] hover:border-[#787b86] text-[#d1d4dc] transition-all cursor-pointer font-bold font-mono tracking-wide shadow-xs group"
            title="Search Symbol (US30, Gold, NASDAQ...)"
          >
            <Search className="w-3.5 h-3.5 text-[#2962FF] group-hover:scale-110 transition-transform" />
            <span className="text-[11px] uppercase font-extrabold text-white">
              {symbolInfo.symbol}
            </span>
            <span className="text-[10px] text-[#787b86] font-normal truncate max-w-[150px] hidden md:inline">
              • {symbolInfo.displayName}
            </span>
            <ChevronDown className="w-3 h-3 text-[#787b86] group-hover:text-white transition-colors ml-0.5" />
          </button>
        </div>

        {/* 2. TIMEFRAME SELECTOR & CHART TYPE & THEME BUTTON */}
        <div className="flex items-center gap-2">
          {/* Segmented 1m / 5m / 15m / 1H / 4H / 1D Selector */}
          <div className="flex items-center bg-[#1e222d] p-0.5 rounded-lg border border-[#2a2e39] shadow-xs font-mono">
            {(['1m', '5m', '15m', '1H', '4H', '1D'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                id={`timeframe-btn-${tf}`}
                onClick={() => onChangeTimeframe(tf)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[#2962FF] text-white shadow-xs'
                    : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
                }`}
                title={`Switch to ${tf} Candles`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[#2a2e39]" />

          {/* Chart Type Selector */}
          <div className="relative">
            <button
              onClick={() => setIsChartTypeMenuOpen(!isChartTypeMenuOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#d1d4dc] hover:text-white transition-colors border border-[#2a2e39] cursor-pointer shadow-xs text-[10px] whitespace-nowrap"
              title="Change Chart Type"
            >
              <LayoutGrid className="w-3 h-3 text-emerald-400" />
              <span className="font-medium hidden sm:inline">{chartType}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {isChartTypeMenuOpen && (
              <div className="absolute top-full right-0 mt-1 bg-[#131722] border border-[#2a2e39] rounded-lg shadow-xl z-50 p-1 min-w-[120px]">
                {chartTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => { onChangeChartType(type); setIsChartTypeMenuOpen(false); }}
                    className={`block w-full text-left px-2 py-1.5 rounded text-[11px] ${chartType === type ? 'bg-[#2962FF] text-white' : 'hover:bg-[#2a2e39] text-[#d1d4dc]'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
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
            <span className="font-medium hidden sm:inline">{t.theme}</span>
          </button>

          {/* Indicators Library Modal Trigger */}
          <button
            id="indicators-btn"
            onClick={onOpenIndicatorLibrary}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#2962FF]/15 hover:bg-[#2962FF]/25 text-[#2962FF] hover:text-white transition-colors border border-[#2962FF]/30 cursor-pointer shadow-xs text-[10px] whitespace-nowrap font-bold"
            title="Manage Indicators & Instant Settings"
          >
            <Sliders className="w-3 h-3 text-[#2962FF]" />
            <span>{t.indicators}</span>
          </button>
        </div>

        {/* 3. MARKET STATUS, YAHOO FINANCE DATA FEED STATUS & REFRESH */}
        <div className="flex items-center gap-2">
          {/* Market Open/Close Badge */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold ${
            marketOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>{marketOpen ? t.marketOpen : t.marketClosed}</span>
          </div>

          {/* Yahoo Finance 60s Cache Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-[10px] font-mono" title="Yahoo Finance v8 API (Cached 60s)">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">{t.yahooFinance}</span>
            <span className="text-[#787b86]">({cacheSecondsLeft}s)</span>
          </div>

          {/* News Alert Popup Trigger */}
          {onTriggerNewsPopup && (
            <button
              id="news-banner-trigger-btn"
              onClick={onTriggerNewsPopup}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-400 hover:text-cyan-200 border border-cyan-500/30 transition-colors cursor-pointer text-[10px] font-bold"
              title="Show Latest Breaking News (10s Banner)"
            >
              <Newspaper className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">News</span>
            </button>
          )}

          {/* Manual Refresh */}
          <button
            id="refresh-feed-btn"
            onClick={onRefreshData}
            disabled={isLoadingData}
            className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-colors cursor-pointer"
            title="Refresh Yahoo Finance Candles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin text-[#2962FF]' : ''}`} />
          </button>
        </div>

      </div>
    </header>
  );
};
