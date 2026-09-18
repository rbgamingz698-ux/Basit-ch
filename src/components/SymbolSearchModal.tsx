import React, { useState } from 'react';
import { Search, X, TrendingUp, Check } from 'lucide-react';
import { SUPPORTED_SYMBOLS } from '../services/marketData';
import { SymbolInfo } from '../types/chart';

interface SymbolSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const SymbolSearchModal: React.FC<SymbolSearchModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  onSelectSymbol,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  if (!isOpen) return null;

  const filtered = SUPPORTED_SYMBOLS.filter((s: SymbolInfo) => {
    const matchQuery = 
      s.symbol.toLowerCase().includes(query.toLowerCase()) ||
      s.displayName.toLowerCase().includes(query.toLowerCase()) ||
      (s.ticker && s.ticker.toLowerCase().includes(query.toLowerCase()));
    
    if (filterType === 'all') return matchQuery;
    return matchQuery && s.type === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div 
        id="symbol-search-modal"
        className="w-full max-w-xl bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#2a2e39] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#787b86]" />
          <input
            id="symbol-search-input"
            type="text"
            placeholder="Search US30, NAS100, SPX, Forex, Gold..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-[#d1d4dc] placeholder-[#787b86] outline-hidden text-base font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[#787b86] hover:text-[#d1d4dc] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            id="close-symbol-search-btn"
            onClick={onClose}
            className="p-1 rounded-md text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#131722] border-b border-[#2a2e39] text-xs font-semibold overflow-x-auto">
          {['all', 'index', 'forex', 'commodity', 'crypto'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3 py-1 rounded-full capitalize transition-colors ${
                filterType === tab
                  ? 'bg-[#2962FF] text-white'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              {tab === 'all' ? 'All Symbols' : tab}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#2a2e39]/50 p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-[#787b86] text-sm">
              No matching symbols found.
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = item.symbol === currentSymbol;
              return (
                <button
                  key={item.symbol}
                  id={`select-symbol-${item.symbol}`}
                  onClick={() => {
                    onSelectSymbol(item.symbol);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                    isSelected 
                      ? 'bg-[#2962FF]/15 border border-[#2962FF]/40' 
                      : 'hover:bg-[#2a2e39]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs ${
                      item.symbol === 'US30' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      item.type === 'index' ? 'bg-blue-500/20 text-blue-400' :
                      item.type === 'forex' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {item.symbol.substring(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#d1d4dc]">{item.symbol}</span>
                        {item.symbol === 'US30' && (
                          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                            PRO
                          </span>
                        )}
                        {item.ticker && (
                          <span className="text-xs text-[#787b86] font-mono">{item.ticker}</span>
                        )}
                      </div>
                      <div className="text-xs text-[#787b86] font-normal">{item.displayName}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#131722] text-[#787b86] border border-[#2a2e39] uppercase text-[10px] font-mono">
                      {item.exchange}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#2962FF]" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#131722] border-t border-[#2a2e39] text-[11px] text-[#787b86] flex items-center justify-between">
          <span>Supported Instruments: <b>Forex, Indices, Crypto, Commodities</b></span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Live Market Stream Active
          </span>
        </div>
      </div>
    </div>
  );
};
