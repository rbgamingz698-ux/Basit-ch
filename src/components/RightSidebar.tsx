import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Flame,
  Globe,
  ChevronRight,
  ChevronLeft,
  Filter
} from 'lucide-react';
import { ForexNewsItem } from '../types/chart';
import { fetchUpcomingForexNews, ENGLISH_IMPACT_MAP } from '../utils/forexNews';
import { SUPPORTED_SYMBOLS } from '../services/marketData';

interface RightSidebarProps {
  currentSymbol: string;
  onSelectSymbol: (sym: string) => void;
  lastPrice: number;
  priceChange: number;
  futureNewsCount: number | undefined;
  onNewsCountChange: ((count: number) => void) | undefined;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  currentSymbol,
  onSelectSymbol,
  lastPrice,
  priceChange,
  futureNewsCount,
  onNewsCountChange,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<'news' | 'watchlist'>('news');
  const [news, setNews] = useState<ForexNewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [selectedImpact, setSelectedImpact] = useState<string>('ALL');

  // Fetch upcoming future news (Strictly future events in English)
  const loadUpcomingNews = async (curr: string = selectedCurrency) => {
    setLoadingNews(true);
    try {
      const items = await fetchUpcomingForexNews(curr, true);
      setNews(items);
      if (onNewsCountChange) {
        onNewsCountChange(items.length);
      }
    } catch (err) {
      console.error('[Upcoming News Error]', err);
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    loadUpcomingNews(selectedCurrency);
    // Refresh news every 2 minutes
    const interval = setInterval(() => {
      loadUpcomingNews(selectedCurrency);
    }, 120000);
    return () => clearInterval(interval);
  }, [selectedCurrency]);

  const currencies = ['USD', 'ALL', 'EUR', 'GBP', 'JPY'];

  const filteredNews = news.filter((item) => {
    if (selectedImpact === 'ALL') return true;
    return item.impact.toUpperCase() === selectedImpact.toUpperCase();
  });

  if (isCollapsed) {
    return (
      <aside 
        id="right-sidebar-collapsed"
        className="w-10 bg-[#131722] border-l border-[#2a2e39] flex flex-col items-center py-3 select-none z-20 shrink-0"
      >
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-colors"
          title="Expand Upcoming News Panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="mt-6 flex flex-col items-center gap-4 text-[#787b86]">
          <button
            onClick={() => { onToggleCollapse(); setActiveTab('news'); }}
            className="p-1.5 hover:text-rose-400 hover:bg-[#1e222d] rounded transition-colors relative"
            title="Upcoming Future News"
          >
            <Calendar className="w-4 h-4 text-rose-400" />
            {news.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
          <button
            onClick={() => { onToggleCollapse(); setActiveTab('watchlist'); }}
            className="p-1.5 hover:text-[#2962FF] hover:bg-[#1e222d] rounded transition-colors"
            title="Market Watchlist"
          >
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside 
      id="right-sidebar"
      aria-label="Upcoming Economic News & Watchlist"
      className="w-80 md:w-92 bg-[#131722] border-l border-[#2a2e39] flex flex-col h-full select-none z-20 shrink-0"
    >
      {/* Panel Header */}
      <div className="h-12 px-3 border-b border-[#2a2e39] flex items-center justify-between bg-[#131722] shrink-0">
        <div className="flex items-center gap-1 bg-[#1e222d] p-0.5 rounded-lg border border-[#2a2e39]">
          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'news'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Upcoming News</span>
            {news.length > 0 && (
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-black/30 font-mono">
                {news.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'watchlist'
                ? 'bg-[#2962FF] text-white shadow-xs'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Watchlist</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {activeTab === 'news' && (
            <button
              onClick={() => loadUpcomingNews(selectedCurrency)}
              disabled={loadingNews}
              className="p-1.5 rounded bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-colors"
              title="Refresh Upcoming Economic Events"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingNews ? 'animate-spin text-rose-400' : ''}`} />
            </button>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-colors"
            title="Collapse Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'news' ? (
          <div className="p-3 space-y-3">
            {/* Filter Bar: Currency & Impact */}
            <div className="space-y-2 bg-[#1e222d]/60 border border-[#2a2e39] p-2.5 rounded-xl">
              <div className="flex items-center justify-between text-[11px] text-[#787b86]">
                <span className="font-semibold text-[#d1d4dc] flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-rose-400" />
                  Upcoming Events Only (Future)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Live Feed</span>
              </div>

              {/* Currency Selector Pills */}
              <div className="flex items-center gap-1">
                {currencies.map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setSelectedCurrency(curr)}
                    className={`flex-1 py-1 rounded-md text-[11px] font-mono font-semibold transition-all ${
                      selectedCurrency === curr
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-[#1e222d] text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] border border-[#2a2e39]'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>

              {/* Impact Level Pills */}
              <div className="flex items-center gap-1 pt-1 border-t border-[#2a2e39]/60">
                {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedImpact(lvl)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      selectedImpact === lvl
                        ? 'bg-[#2962FF] text-white font-semibold'
                        : 'text-[#787b86] hover:text-[#d1d4dc]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Event List */}
            {loadingNews && news.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-xs text-[#787b86]">
                <RefreshCw className="w-5 h-5 text-rose-400 animate-spin" />
                <span>Loading real-time upcoming events...</span>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#787b86] space-y-2 bg-[#1e222d]/40 rounded-xl p-4 border border-[#2a2e39]">
                <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
                <p className="font-semibold text-[#d1d4dc]">No Upcoming Events for {selectedCurrency}</p>
                <p className="text-[11px]">All scheduled events for this specific currency filter have completed. Switch to "ALL" or "USD" to view upcoming international events.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNews.map((item, idx) => {
                  const impactInfo = ENGLISH_IMPACT_MAP[item.impact] || {
                    label: item.impact,
                    color: '#787b86',
                    bg: 'rgba(120, 123, 134, 0.15)',
                  };

                  const isHigh = item.impact === 'High';

                  return (
                    <div
                      key={`${item.title}-${item.date}-${idx}`}
                      className={`p-3 rounded-xl border transition-all ${
                        isHigh
                          ? 'bg-[#1e222d] border-rose-500/40 hover:border-rose-500 shadow-xs'
                          : 'bg-[#1e222d]/80 border-[#2a2e39] hover:border-[#363a45]'
                      }`}
                    >
                      {/* Top Row: Currency, Impact Badge & Countdown */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-black/40 text-white border border-[#2a2e39]">
                            {item.currency}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-semibold"
                            style={{ color: impactInfo.color, backgroundColor: impactInfo.bg }}
                          >
                            {impactInfo.label}
                          </span>
                        </div>

                        {/* Relative Countdown badge */}
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-rose-400" />
                          {item.countdown}
                        </span>
                      </div>

                      {/* Event Title */}
                      <h4 className="text-xs font-semibold text-white leading-snug">
                        {item.title}
                      </h4>

                      {/* Date & Time (English) */}
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#787b86]">
                        <span>{item.formattedDate}</span>
                        <span className="font-mono text-white font-medium">{item.formattedTime}</span>
                      </div>

                      {/* Forecast & Previous Stats */}
                      {(item.forecast || item.previous) && (
                        <div className="mt-2 pt-2 border-t border-[#2a2e39] grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div className="bg-[#131722] p-1.5 rounded-md">
                            <span className="text-[#787b86] block text-[9px] uppercase tracking-wider">Forecast</span>
                            <span className="text-amber-300 font-bold">{item.forecast || '-'}</span>
                          </div>
                          <div className="bg-[#131722] p-1.5 rounded-md">
                            <span className="text-[#787b86] block text-[9px] uppercase tracking-wider">Previous</span>
                            <span className="text-[#d1d4dc] font-bold">{item.previous || '-'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Market Watchlist Tab */
          <div className="p-3 space-y-2">
            <div className="text-[11px] font-semibold text-[#787b86] px-1 mb-2">
              Real-Time Market Instruments
            </div>

            {SUPPORTED_SYMBOLS.map((s) => {
              const isSelected = s.symbol === currentSymbol;
              return (
                <button
                  key={s.symbol}
                  onClick={() => onSelectSymbol(s.symbol)}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#2962FF]/15 border-[#2962FF] shadow-xs'
                      : 'bg-[#1e222d] border-[#2a2e39] hover:bg-[#2a2e39]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white">{s.symbol}</span>
                      {s.ticker && (
                        <span className="text-[10px] text-[#787b86] font-mono">{s.ticker}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#787b86] block truncate max-w-[180px]">
                      {s.displayName}
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-white block">
                      {isSelected && lastPrice > 0 ? lastPrice.toFixed(s.precision) : s.basePrice.toFixed(s.precision)}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                      {s.exchange}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
