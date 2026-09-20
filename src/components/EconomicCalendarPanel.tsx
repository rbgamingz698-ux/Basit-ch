import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  RefreshCw,
  Flame,
  Globe,
  CheckCircle2,
  X,
  Zap,
  Search,
  TrendingUp,
  AlertOctagon
} from 'lucide-react';
import { ForexNewsItem } from '../types/chart';
import { fetchUpcomingForexNews, ENGLISH_IMPACT_MAP } from '../utils/forexNews';

interface EconomicCalendarPanelProps {
  showHeader?: boolean;
  onClose?: () => void;
  onNewsCountChange?: (count: number) => void;
  className?: string;
}

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  NZD: '🇳🇿',
  CNY: '🇨🇳',
  DEM: '🇩🇪',
  FRF: '🇫🇷',
  ITL: '🇮🇹',
};

export const EconomicCalendarPanel: React.FC<EconomicCalendarPanelProps> = ({
  showHeader = true,
  onClose,
  onNewsCountChange,
  className = '',
}) => {
  const [news, setNews] = useState<ForexNewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadUpcomingNews = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch for 'ALL' currencies
      const items = await fetchUpcomingForexNews('ALL', true);
      // Filter strictly for High impact news across all symbols/currencies
      const highImpactOnly = items.filter(i => i.impact && i.impact.toLowerCase() === 'high');
      setNews(highImpactOnly);
      if (onNewsCountChange) {
        onNewsCountChange(highImpactOnly.length);
      }
    } catch (err) {
      console.error('[Upcoming High Impact News Error]', err);
    } finally {
      setLoading(false);
    }
  }, [onNewsCountChange]);

  useEffect(() => {
    loadUpcomingNews();
    const interval = setInterval(() => {
      loadUpcomingNews();
    }, 120000);
    return () => clearInterval(interval);
  }, [loadUpcomingNews]);

  const filteredNews = news.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.country.toLowerCase().includes(q) ||
      (item.forecast && item.forecast.toLowerCase().includes(q))
    );
  });

  return (
    <div className={`flex flex-col h-full bg-[#131722] text-[#d1d4dc] select-none ${className}`}>
      {/* Optional Header */}
      {showHeader && (
        <div className="h-13 px-3.5 border-b border-[#2a2e39] flex items-center justify-between bg-[#131722] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 text-rose-400 border border-rose-500/30 shadow-inner">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-white tracking-wide">Macro Economic Matrix</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-[10px] text-[#787b86] font-mono block">
                Global Tier-1 High Impact Releases
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loadUpcomingNews()}
              disabled={loading}
              className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-all cursor-pointer shadow-xs"
              title="Refresh Economic Calendar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-rose-900/20 text-[#787b86] hover:text-rose-400 border border-[#2a2e39] transition-all cursor-pointer shadow-xs"
                title="Close Calendar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Subheader Banner & Search Bar */}
      <div className="p-3 border-b border-[#2a2e39] bg-[#1e222d]/60 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[11px] text-white flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-rose-400 fill-rose-500 animate-bounce" />
            High-Volatility Alert Stream
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
            {filteredNews.length} Active Events
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#787b86] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events, country, currency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#787b86] focus:outline-hidden focus:border-[#2962FF] font-mono transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#787b86] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main List of Events */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
        {loading && news.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-center text-xs text-[#787b86]">
            <RefreshCw className="w-6 h-6 text-rose-400 animate-spin" />
            <p className="font-semibold text-white">Synchronizing Global Feeds...</p>
            <span className="text-[11px] text-[#787b86]">ForexFactory Direct Data Stream</span>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#787b86] space-y-2 bg-[#1e222d]/40 rounded-xl p-5 border border-[#2a2e39]">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="font-semibold text-[#d1d4dc]">No Matching High-Impact Releases</p>
            <p className="text-[11px]">All markets stable or no events match "{searchQuery}".</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-3 py-1 rounded-md bg-[#2962FF] text-white text-xs hover:bg-[#2962FF]/80 font-bold"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          filteredNews.map((item, idx) => {
            const isToday = item.countdown.includes('In') && !item.countdown.includes('days');
            const isTomorrow = item.countdown.includes('Tomorrow');

            return (
              <div
                key={`${item.title}-${item.timestamp}-${idx}`}
                className="p-4 rounded-xl bg-gradient-to-b from-[#1e222d] to-[#161922] border border-rose-500/40 hover:border-rose-500/90 transition-all duration-200 shadow-xl group relative overflow-hidden"
              >
                {/* Glowing top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 shadow-rose-500 shadow-md" />

                {/* Header: Currency badge, Ultra-vibrant High Impact pill, and Countdown */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-extrabold bg-[#131722] text-white border border-[#2a2e39] shadow-inner flex items-center gap-1.5">
                      <span className="text-xs">{CURRENCY_FLAGS[item.country] || '🌐'}</span>
                      <span>{item.country}</span>
                    </span>

                    <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black tracking-wider flex items-center gap-1 font-mono uppercase bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-rose-900/50 border border-red-400/40 animate-pulse">
                      <Flame className="w-3 h-3 fill-amber-300 text-amber-300" />
                      HIGH IMPACT
                    </span>
                  </div>

                  {/* Countdown with dynamic urgency color */}
                  <div className={`flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border shadow-inner ${
                    isToday
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : isTomorrow
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    <Clock className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
                    <span>{item.countdown}</span>
                  </div>
                </div>

                {/* Event Name */}
                <h4 className="text-xs font-bold text-white leading-relaxed group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h4>

                {/* Scheduled Time & Date */}
                <div className="mt-3 pt-2.5 border-t border-[#2a2e39]/80 flex items-center justify-between text-[10px] text-[#787b86]">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#2962FF]" />
                    <span className="font-medium text-[#d1d4dc]">{item.formattedDate}</span>
                  </span>
                  <span className="font-mono text-white font-bold bg-[#131722] px-2 py-0.5 rounded border border-[#2a2e39]">
                    {item.formattedTime}
                  </span>
                </div>

                {/* Forecast & Previous Stats */}
                {(item.forecast || item.previous) && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-[#131722]/80 p-2 rounded-lg border border-[#2a2e39] flex flex-col justify-between">
                      <span className="text-[#787b86] text-[9px] uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-amber-400" />
                        Forecast
                      </span>
                      <span className="text-amber-300 font-extrabold text-xs mt-0.5">{item.forecast || '-'}</span>
                    </div>
                    <div className="bg-[#131722]/80 p-2 rounded-lg border border-[#2a2e39] flex flex-col justify-between">
                      <span className="text-[#787b86] text-[9px] uppercase tracking-wider flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3 text-blue-400" />
                        Previous
                      </span>
                      <span className="text-[#d1d4dc] font-extrabold text-xs mt-0.5">{item.previous || '-'}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status */}
      <div className="h-8 px-3.5 border-t border-[#2a2e39] bg-[#131722] flex items-center justify-between text-[10px] font-mono text-[#787b86] shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          Tier-1 Volatility Engine Active
        </span>
        <span className="flex items-center gap-1 text-emerald-400 font-bold">
          Live Sync
        </span>
      </div>
    </div>
  );
};

