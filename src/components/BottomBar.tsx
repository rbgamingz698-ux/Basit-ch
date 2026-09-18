import React, { useState, useEffect } from 'react';
import { Clock, Globe, ArrowUpRight, Radio } from 'lucide-react';
import { SUPPORTED_SYMBOLS } from '../services/marketData';
import { formatPktTimeString } from '../utils/time';

interface BottomBarProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  lastPrice: number;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  currentSymbol,
  onSelectSymbol,
  lastPrice,
}) => {
  const [pktClock, setPktClock] = useState<string>(() => formatPktTimeString());

  // Update PKT clock every second
  useEffect(() => {
    const updateTime = () => {
      setPktClock(formatPktTimeString());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer 
      id="bottom-bar"
      className="h-8 bg-[#131722] border-t border-[#2a2e39] flex items-center justify-between px-3 text-[11px] text-[#787b86] select-none z-20 shrink-0 overflow-hidden"
    >
      {/* Left: US30 & NASDAQ (US100) Quick Ticker */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar font-mono">
        <span className="text-[10px] font-bold text-[#d1d4dc] uppercase flex items-center gap-1">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          Market Ticker:
        </span>
        {SUPPORTED_SYMBOLS.map((s) => {
          const isSelected = s.symbol === currentSymbol;
          const displayVal = isSelected && lastPrice > 0 ? lastPrice : s.basePrice;
          return (
            <button
              key={s.symbol}
              id={`bottom-ticker-${s.symbol}`}
              onClick={() => onSelectSymbol(s.symbol)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#2962FF]/20 text-[#2962FF] font-bold border border-[#2962FF]/40'
                  : 'hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              <span>{s.symbol}</span>
              <span className="text-white font-semibold">{displayVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-emerald-400 text-[10px] flex items-center">
                <ArrowUpRight className="w-2.5 h-2.5" />
                Live
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: Dedicated PKT (UTC+5:30) Clock Display */}
      <div className="flex items-center gap-2 font-mono shrink-0 ml-2">
        <div className="flex items-center gap-1.5 bg-[#1e222d] px-2.5 py-0.5 rounded-md border border-[#2a2e39] text-[#d1d4dc]">
          <Globe className="w-3 h-3 text-[#2962FF]" />
          <span className="text-[10px] font-bold text-[#2962FF] tracking-wider">PKT (UTC+5:30)</span>
          <span className="text-[#787b86]">|</span>
          <Clock className="w-3 h-3 text-[#787b86]" />
          <span className="font-bold text-white tracking-wide text-xs">{pktClock}</span>
        </div>
      </div>
    </footer>
  );
};
