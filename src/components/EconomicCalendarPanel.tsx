import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  RefreshCw,
  AlertTriangle,
  Flame,
  Globe,
  Filter,
  CheckCircle2,
  X
} from 'lucide-react';
import { ForexNewsItem } from '../types/chart';
import { fetchUpcomingForexNews, ENGLISH_IMPACT_MAP } from '../utils/forexNews';

interface EconomicCalendarPanelProps {
  showHeader?: boolean;
  onClose?: () => void;
  onNewsCountChange?: (count: number) => void;
  className?: string;
}

export const EconomicCalendarPanel: React.FC<EconomicCalendarPanelProps> = ({
  showHeader = true,
  onClose,
  onNewsCountChange,
  className = '',
}) => {
  const [news, setNews] = useState<ForexNewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [selectedImpact, setSelectedImpact] = useState<string>('ALL');

  const loadUpcomingNews = useCallback(async (curr: string = selectedCurrency) => {
    setLoading(true);
    try {
      const items = await fetchUpcomingForexNews(curr, true);
      setNews(items);
      if (onNewsCountChange) {
        onNewsCountChange(items.length);
      }
    } catch (err) {
      console.error('[Upcoming News Error]', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCurrency, onNewsCountChange]);

  useEffect(() => {
    loadUpcomingNews(selectedCurrency);
    const interval = setInterval(() => {
      loadUpcomingNews(selectedCurrency);
    }, 120000);
    return () => clearInterval(interval);
  }, [loadUpcomingNews, selectedCurrency]);

  const currencies = ['USD', 'ALL', 'EUR', 'GBP', 'JPY'];

  const filteredNews = news.filter((item) => {
    if (selectedImpact === 'ALL') return true;
    return item.impact.toUpperCase() === selectedImpact.toUpperCase();
  });

  return (
    <div className={`flex flex-col h-full bg-[#131722] text-[#d1d4dc] select-none ${className}`}>
      {/* Optional Header */}
      {showHeader && (
        <div className="h-12 px-3 border-b border-[#2a2e39] flex items-center justify-between bg-[#131722] shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-white">Economic Calendar</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-[10px] text-[#787b86] font-mono block">
                ForexFactory • Future Events Only
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => loadUpcomingNews(selectedCurrency)}
              disabled={loading}
              className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-colors cursor-pointer"
              title="Refresh Economic Calendar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-rose-900/20 text-[#787b86] hover:text-rose-400 border border-[#2a2e39] transition-colors cursor-pointer"
                title="Close Calendar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Bar: Currency & Impact */}
      <div className="p-3 border-b border-[#2a2e39] bg-[#1e222d]/40 space-y-2 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-[#787b86]">
          <span className="font-semibold text-[#d1d4dc] flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-rose-400" />
            Upcoming Future Events
          </span>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {filteredNews.length} Upcoming
          </span>
        </div>

        {/* Currency Selector Pills */}
        <div className="flex items-center gap-1">
          {currencies.map((curr) => (
            <button
              key={curr}
              onClick={() => setSelectedCurrency(curr)}
              className={`flex-1 py-1 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                selectedCurrency === curr
                  ? 'bg-rose-500 text-white shadow-xs font-bold'
                  : 'bg-[#131722] text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d] border border-[#2a2e39]'
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
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
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

      {/* Main List of Events */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2.5">
        {loading && news.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-center text-xs text-[#787b86]">
            <RefreshCw className="w-6 h-6 text-rose-400 animate-spin" />
            <p className="font-semibold text-white">Loading Upcoming Macro Events...</p>
            <span className="text-[11px] text-[#787b86]">ForexFactory Economic Schedule</span>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#787b86] space-y-2 bg-[#1e222d]/40 rounded-xl p-4 border border-[#2a2e39]">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
            <p className="font-semibold text-[#d1d4dc]">No Upcoming High-Impact Releases</p>
            <p className="text-[11px]">No future events match currency {selectedCurrency} ({selectedImpact}).</p>
            <button
              onClick={() => { setSelectedCurrency('ALL'); setSelectedImpact('ALL'); }}
              className="px-3 py-1 rounded-md bg-[#1e222d] text-white text-xs hover:bg-[#2a2e39] border border-[#2a2e39]"
            >
              Show All Events
            </button>
          </div>
        ) : (
          filteredNews.map((item, idx) => {
            const impactStyle = ENGLISH_IMPACT_MAP[item.impact] || ENGLISH_IMPACT_MAP['Low'];
            const isHigh = item.impact.toLowerCase() === 'high';

            return (
              <div
                key={`${item.title}-${item.timestamp}-${idx}`}
                className={`p-3 rounded-xl border transition-all duration-150 ${
                  isHigh
                    ? 'bg-[#1e222d] border-rose-500/30 hover:border-rose-500/60 shadow-xs'
                    : 'bg-[#1e222d] border-[#2a2e39] hover:border-[#434855]'
                }`}
              >
                {/* Header: Currency badge, Impact pill, and Countdown */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#131722] text-white border border-[#2a2e39]">
                      {item.country}
                    </span>

                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 font-mono uppercase"
                      style={{ color: impactStyle.color, backgroundColor: impactStyle.bg }}
                    >
                      {isHigh && <Flame className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />}
                      {item.impact}
                    </span>
                  </div>

                  {/* English Countdown */}
                  <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{item.countdown}</span>
                  </div>
                </div>

                {/* Event Name */}
                <h4 className="text-xs font-semibold text-white leading-snug">
                  {item.title}
                </h4>

                {/* Scheduled Time & Date */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-[#787b86]">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-[#787b86]" />
                    {item.formattedDate}
                  </span>
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
          })
        )}
      </div>

      {/* Footer Status */}
      <div className="h-8 px-3 border-t border-[#2a2e39] bg-[#131722] flex items-center justify-between text-[10px] font-mono text-[#787b86] shrink-0">
        <span>Upcoming Macro Feed</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Auto-sync 2m
        </span>
      </div>
    </div>
  );
};
