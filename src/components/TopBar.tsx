import React, { useState } from 'react';
import {
  Sliders,
  Search,
  Layers,
  Maximize,
  Minimize,
} from 'lucide-react';
import { ChartType, Timeframe } from '../types/chart';
import { getSymbolInfo } from '../services/marketData';
import { Language, getTranslation } from '../utils/thaiTranslation';
import { SymbolLogo } from './SymbolLogo';
import { PingIndicator } from './PingIndicator';

interface TopBarProps {
  symbol: string;
  onSelectSymbol: (sym: string) => void;
  onOpenSymbolSearch: () => void;
  timeframe: Timeframe;
  onChangeTimeframe: (tf: Timeframe) => void;
  chartType: ChartType;
  onChangeChartType: (type: ChartType) => void;
  onOpenIndicatorLibrary?: () => void;
  language?: Language;
  onToggleStockDetail?: () => void;
  isStockDetailOpen?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  symbol,
  onOpenSymbolSearch,
  timeframe,
  onChangeTimeframe,
  onOpenIndicatorLibrary,
  language = 'EN',
  onToggleStockDetail,
  isStockDetailOpen,
}) => {
  const symbolInfo = getSymbolInfo(symbol);
  const t = getTranslation(language || 'EN');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header 
      id="top-bar"
      className="h-14 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between px-3 text-xs select-none z-30 shrink-0 shadow-sm overflow-x-auto"
    >
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-2 min-w-max">
        
        {/* Symbol Switcher / Search with TradingView Logo & Asset Badge */}
        <div className="flex items-center gap-1.5">
          <button
            id="symbol-search-btn"
            onClick={onOpenSymbolSearch}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] hover:border-[#787b86] text-[#d1d4dc] transition-all cursor-pointer font-bold font-mono tracking-wide shadow-xs group"
            title="Search Symbol (DJI, NQ, GC, CL)"
          >
            <div className="flex items-center gap-1.5">
              <SymbolLogo symbol="tradingview" size="xs" />
              <SymbolLogo symbol={symbolInfo.symbol} size="xs" />
            </div>
            <span className="text-[11px] uppercase font-extrabold text-white">
              {symbolInfo.symbol}
            </span>
            <span className="text-[10px] text-[#787b86] font-normal truncate max-w-[170px] hidden md:inline">
              • {symbolInfo.displayName}
            </span>
            <Search className="w-3.5 h-3.5 text-[#787b86] group-hover:text-[#2962FF] group-hover:scale-110 transition-all ml-1" />
          </button>

          {/* Toggle Left Stock Detail Drawer */}
          {onToggleStockDetail && (
            <button
              onClick={onToggleStockDetail}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-xs ${
                isStockDetailOpen
                  ? 'bg-[#2962FF] text-white border-[#2962FF]'
                  : 'bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border-[#2a2e39]'
              }`}
              title={isStockDetailOpen ? 'Hide Stock Overview Panel' : 'Show Stock Overview Panel'}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Timeframe Selector & Indicators */}
        <div className="flex items-center gap-2">
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

          {onOpenIndicatorLibrary && (
            <>
              <div className="h-4 w-px bg-[#2a2e39]" />
              <button
                id="indicators-btn"
                onClick={onOpenIndicatorLibrary}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2962FF]/15 hover:bg-[#2962FF]/25 text-[#2962FF] hover:text-white transition-colors border border-[#2962FF]/30 cursor-pointer shadow-xs text-[10px] whitespace-nowrap font-bold"
                title="Manage Indicators & Instant Settings"
              >
                <Sliders className="w-3.5 h-3.5 text-[#2962FF]" />
                <span>{t.indicators}</span>
              </button>
            </>
          )}
        </div>

        {/* Fullscreen Button & Ping */}
        <div className="flex items-center gap-2">
          <PingIndicator />
          <button
            onClick={toggleFullScreen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#d1d4dc] transition-colors cursor-pointer text-[10px] font-bold shadow-xs"
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-[#2962FF]" /> : <Maximize className="w-3.5 h-3.5 text-[#2962FF]" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>

      </div>
    </header>
  );
};
