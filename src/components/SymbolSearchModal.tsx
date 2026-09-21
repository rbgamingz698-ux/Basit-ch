import React, { useState } from 'react';
import { Search, X, Check, Activity } from 'lucide-react';
import { SUPPORTED_SYMBOLS } from '../services/marketData';
import { SymbolInfo } from '../types/chart';
import { SymbolLogo } from './SymbolLogo';

interface SymbolSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  symbolStats?: Record<string, { price: number; change: number; changePercent: number }>;
}

export const SymbolSearchModal: React.FC<SymbolSearchModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  onSelectSymbol,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolInfo | null>(null);

  const resetSelection = () => {
    setQuery('');
    setSelectedSymbol(null);
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div 
        id="symbol-search-modal"
        className="w-full max-w-xl bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-[#2a2e39] flex items-center gap-3 bg-[#181c25]">
          <div className="flex items-center gap-2 shrink-0">
            <SymbolLogo symbol="tradingview" size="sm" />
            <Search className="w-4 h-4 text-[#787b86]" />
          </div>
          <input
            id="symbol-search-input"
            type="text"
            placeholder={selectedSymbol ? "Select Session" : "Search symbols (DJI, NQ, GC, CL)..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-[#d1d4dc] placeholder-[#787b86] outline-hidden text-base font-medium font-mono"
            disabled={!!selectedSymbol}
          />
          <button
            id="close-symbol-search-btn"
            onClick={() => {
                resetSelection();
                onClose();
            }}
            className="p-1 rounded-md text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedSymbol ? (
            <>
              {/* Filter Tabs */}
              <div className="flex items-center gap-2 px-4 py-2 bg-[#131722] border-b border-[#2a2e39] text-xs font-semibold overflow-x-auto">
                {['all', 'index', 'commodity'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterType(tab)}
                    className={`px-3 py-1 rounded-full capitalize transition-colors ${
                      filterType === tab
                        ? 'bg-[#2962FF] text-white'
                        : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
                    }`}
                  >
                    {tab === 'all' ? 'All Instruments' : tab}
                  </button>
                ))}
              </div>

              {/* Results List */}
              <div className="divide-y divide-[#2a2e39]/50 p-2">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-[#787b86] text-sm">
                    No matching symbols found.
                  </div>
                ) : (
                  filtered.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => setSelectedSymbol(item)}
                      className="w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors hover:bg-[#2a2e39]"
                    >
                      <div className="flex items-center gap-3">
                        <SymbolLogo symbol={item.symbol} size="md" />
                        <div>
                          <div className="font-bold text-sm text-white">{item.symbol}</div>
                          <div className="text-xs text-[#787b86] font-normal">{item.displayName}</div>
                        </div>
                      </div>
                      <div className="text-xs text-[#787b86] font-mono border border-[#2a2e39] px-2 py-1 rounded">
                        {item.exchange}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="p-6 flex flex-col gap-4">
              <div className="text-center">
                  <div className="font-bold text-2xl text-white">{selectedSymbol.symbol}</div>
                  <div className="text-sm text-[#787b86]">{selectedSymbol.displayName}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                        onSelectSymbol(`${selectedSymbol.symbol}-ETH`);
                        resetSelection();
                        onClose();
                    }}
                    className="p-4 bg-[#1e222d] border border-[#2962FF] rounded-lg text-center hover:bg-[#2a2e39] transition-colors"
                  >
                      <div className="font-bold text-lg text-white">ETH</div>
                      <div className="text-xs text-[#787b86]">Extended Trading Hours</div>
                  </button>
                  <button 
                    onClick={() => {
                        onSelectSymbol(`${selectedSymbol.symbol}-RTH`);
                        resetSelection();
                        onClose();
                    }}
                    className="p-4 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-center hover:bg-[#2a2e39] transition-colors"
                  >
                      <div className="font-bold text-lg text-white">RTH</div>
                      <div className="text-xs text-[#787b86]">Regular Trading Hours</div>
                  </button>
              </div>
              <button 
                onClick={resetSelection}
                className="text-sm text-[#787b86] hover:text-white mt-4"
              >
                ← Back to symbols
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
