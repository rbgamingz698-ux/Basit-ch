import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Newspaper, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Clock, 
  Filter, 
  AlertCircle,
  TrendingUp,
  Globe2,
  Building2,
  Cpu,
  Landmark,
  X
} from 'lucide-react';
import { GEOPOLITICAL_KEYWORDS } from '../utils/stockNews';
import { analyzeArticleImpact, aggregateSymbolSentiments } from '../utils/symbolNewsImpact';

export interface StockArticle {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number; // epoch seconds
  relatedTickers?: string[];
}

interface StocksNewsPanelProps {
  currentSymbol?: string;
  onSelectSymbol?: (sym: string) => void;
  onNewNews?: (article: StockArticle) => void;
  showHeader?: boolean;
  onClose?: () => void;
  className?: string;
}

type NewsFilterCategory = 'all' | 'ym' | 'nq' | 'gc' | 'dow' | 'tech' | 'geopolitics' | 'macro';

export const StocksNewsPanel: React.FC<StocksNewsPanelProps> = ({
  currentSymbol = 'US30',
  onSelectSymbol,
  onNewNews,
  showHeader = true,
  onClose,
  className = '',
}) => {
  const [articles, setArticles] = useState<StockArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<NewsFilterCategory>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const seenUuids = React.useRef<Set<string>>(new Set());

  // Overall symbol sentiments for YM, NQ, GC
  const overallSentiments = useMemo(() => {
    return aggregateSymbolSentiments(articles);
  }, [articles]);

  // Fetch real-time multi-source news from server endpoint (which bundles Investing, MarketWatch, CNBC, Yahoo)
  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/geopolitics-news');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      if (data && Array.isArray(data.news)) {
        const fetched: StockArticle[] = data.news.map((item: any, idx: number) => ({
          uuid: item.uuid || item.link || `news-${idx}-${Date.now()}`,
          title: item.title || 'Market Update',
          publisher: item.publisher || 'Financial Wire',
          link: item.link || '#',
          providerPublishTime: item.providerPublishTime || Math.floor(Date.now() / 1000),
          relatedTickers: item.relatedTickers || [],
        }));

        // Detect any newly incoming breaking headlines
        if (onNewNews && fetched.length > 0) {
          const newest = fetched[0];
          if (seenUuids.current.size > 0 && !seenUuids.current.has(newest.uuid)) {
            onNewNews(newest);
          }
        }
        fetched.forEach(item => seenUuids.current.add(item.uuid));

        setArticles(fetched);
        setLastUpdated(new Date());
      } else {
        setArticles([]);
      }
    } catch (err: any) {
      console.error('Failed to load stocks news:', err);
      setError('Unable to fetch live feed. Tap refresh to retry.');
    } finally {
      setLoading(false);
    }
  }, [onNewNews]);

  // Initial fetch and 60-second polling
  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  // Tag helper to classify headlines
  const getArticleTags = (title: string, publisher: string) => {
    const lower = title.toLowerCase();
    const tags: { label: string; color: string; bg: string }[] = [];

    const isGeo = GEOPOLITICAL_KEYWORDS.some(kw => lower.includes(kw));
    if (isGeo) {
      tags.push({ label: 'Geopolitical', color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30' });
    }

    if (lower.includes('dow') || lower.includes('djia') || lower.includes('us30') || lower.includes('blue-chip') || lower.includes('industrial')) {
      tags.push({ label: 'Dow / US30', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' });
    }

    if (lower.includes('nasdaq') || lower.includes('tech') || lower.includes('nvidia') || lower.includes('apple') || lower.includes('ai') || lower.includes('chips')) {
      tags.push({ label: 'Tech & Nasdaq', color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30' });
    }

    if (lower.includes('fed') || lower.includes('rate') || lower.includes('powell') || lower.includes('cpi') || lower.includes('inflation') || lower.includes('yield')) {
      tags.push({ label: 'Fed & Rates', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' });
    }

    if (lower.includes('gold') || lower.includes('oil') || lower.includes('crude') || lower.includes('energy')) {
      tags.push({ label: 'Commodities', color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' });
    }

    return tags;
  };

  // Publisher badge color mapping
  const getPublisherStyle = (publisher: string) => {
    const pub = publisher.toLowerCase();
    if (pub.includes('investing')) return { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
    if (pub.includes('cnbc')) return { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    if (pub.includes('marketwatch')) return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    if (pub.includes('yahoo')) return { bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    if (pub.includes('wall st') || pub.includes('thestreet')) return { bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    if (pub.includes('bloomberg') || pub.includes('reuters')) return { bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    return { bg: 'bg-[#2a2e39] text-[#d1d4dc] border-[#363a45]' };
  };

  // Format relative time (e.g. 3m ago, 1h ago)
  const formatTimeAgo = (epochSec: number) => {
    const diffSec = Math.max(0, Math.floor(Date.now() / 1000) - epochSec);
    if (diffSec < 60) return 'Just now';
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Filter articles based on category and search query
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const titleLower = article.title.toLowerCase();
      const pubLower = article.publisher.toLowerCase();

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery = titleLower.includes(query) || pubLower.includes(query);
        if (!matchesQuery) return false;
      }

      // Category match
      if (selectedCategory === 'ym') {
        const analysis = analyzeArticleImpact(article.title, article.publisher);
        return analysis.impactedSymbols.some(s => s.symbol === 'YM');
      }
      if (selectedCategory === 'nq') {
        const analysis = analyzeArticleImpact(article.title, article.publisher);
        return analysis.impactedSymbols.some(s => s.symbol === 'NQ');
      }
      if (selectedCategory === 'gc') {
        const analysis = analyzeArticleImpact(article.title, article.publisher);
        return analysis.impactedSymbols.some(s => s.symbol === 'GC') || titleLower.includes('gold');
      }
      if (selectedCategory === 'dow') {
        return (
          titleLower.includes('dow') ||
          titleLower.includes('djia') ||
          titleLower.includes('us30') ||
          titleLower.includes('blue-chip') ||
          titleLower.includes('industrial') ||
          titleLower.includes('wall street')
        );
      }
      if (selectedCategory === 'tech') {
        return (
          titleLower.includes('nasdaq') ||
          titleLower.includes('tech') ||
          titleLower.includes('nvidia') ||
          titleLower.includes('apple') ||
          titleLower.includes('microsoft') ||
          titleLower.includes('ai') ||
          titleLower.includes('semiconductor')
        );
      }
      if (selectedCategory === 'geopolitics') {
        return GEOPOLITICAL_KEYWORDS.some(kw => titleLower.includes(kw));
      }
      if (selectedCategory === 'macro') {
        return (
          titleLower.includes('fed') ||
          titleLower.includes('powell') ||
          titleLower.includes('rate') ||
          titleLower.includes('inflation') ||
          titleLower.includes('cpi') ||
          titleLower.includes('treasury') ||
          titleLower.includes('economy')
        );
      }

      return true;
    });
  }, [articles, searchQuery, selectedCategory]);

  return (
    <div className={`flex flex-col h-full bg-[#131722] text-[#d1d4dc] select-none ${className}`}>
      {/* Optional Panel Header */}
      {showHeader && (
        <div className="h-12 px-3 border-b border-[#2a2e39] flex items-center justify-between bg-[#131722] shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Newspaper className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-white">Stocks & Market News</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-[10px] text-[#787b86] font-mono block">
                Live Multi-Wire • Wall St & Macro
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={fetchNews}
              disabled={loading}
              className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-colors cursor-pointer"
              title="Refresh News Feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-[#1e222d] hover:bg-rose-900/20 text-[#787b86] hover:text-rose-400 border border-[#2a2e39] transition-colors cursor-pointer"
                title="Close News Panel"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Symbol Sentiment Overview Strip (GC, YM, NQ) */}
      <div className="px-3 py-2 bg-[#181b24] border-b border-[#2a2e39] shrink-0">
        <div className="flex items-center justify-between text-[10px] text-[#787b86] mb-1.5 font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="text-[#d1d4dc]">Market Impact:</span>
            <span className="text-emerald-400 font-bold">🚀 = Bull</span>
            <span className="text-amber-400 font-bold">🪙 = Bear</span>
          </span>
          <span className="text-[9px] text-[#787b86]">Tap to filter wire</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {/* YM Button */}
          <button
            onClick={() => setSelectedCategory(selectedCategory === 'ym' ? 'all' : 'ym')}
            className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
              selectedCategory === 'ym'
                ? 'bg-amber-500/20 border-amber-500/60 text-white'
                : 'bg-[#1e222d] border-[#2a2e39] hover:border-amber-500/30'
            }`}
          >
            <div>
              <div className="font-bold text-[11px] text-white">YM (Dow)</div>
              <div className="text-[9px] text-[#787b86]">{overallSentiments.ym.score}% Flow</div>
            </div>
            <div className="flex items-center gap-1 font-bold text-sm">
              <span>{overallSentiments.ym.emoji}</span>
              <span className={`text-[10px] font-bold ${overallSentiments.ym.sentiment === 'bull' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {overallSentiments.ym.sentiment.toUpperCase()}
              </span>
            </div>
          </button>

          {/* NQ Button */}
          <button
            onClick={() => setSelectedCategory(selectedCategory === 'nq' ? 'all' : 'nq')}
            className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
              selectedCategory === 'nq'
                ? 'bg-cyan-500/20 border-cyan-500/60 text-white'
                : 'bg-[#1e222d] border-[#2a2e39] hover:border-cyan-500/30'
            }`}
          >
            <div>
              <div className="font-bold text-[11px] text-white">NQ (Nas)</div>
              <div className="text-[9px] text-[#787b86]">{overallSentiments.nq.score}% Flow</div>
            </div>
            <div className="flex items-center gap-1 font-bold text-sm">
              <span>{overallSentiments.nq.emoji}</span>
              <span className={`text-[10px] font-bold ${overallSentiments.nq.sentiment === 'bull' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {overallSentiments.nq.sentiment.toUpperCase()}
              </span>
            </div>
          </button>

          {/* GC Button */}
          <button
            onClick={() => setSelectedCategory(selectedCategory === 'gc' ? 'all' : 'gc')}
            className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
              selectedCategory === 'gc'
                ? 'bg-yellow-500/20 border-yellow-500/60 text-white'
                : 'bg-[#1e222d] border-[#2a2e39] hover:border-yellow-500/30'
            }`}
          >
            <div>
              <div className="font-bold text-[11px] text-white">GC (Gold)</div>
              <div className="text-[9px] text-[#787b86]">{overallSentiments.gc.score}% Flow</div>
            </div>
            <div className="flex items-center gap-1 font-bold text-sm">
              <span>{overallSentiments.gc.emoji}</span>
              <span className={`text-[10px] font-bold ${overallSentiments.gc.sentiment === 'bull' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {overallSentiments.gc.sentiment.toUpperCase()}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Category Filter Pills */}
      <div className="p-3 border-b border-[#2a2e39] bg-[#1e222d]/40 space-y-2.5 shrink-0">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[#787b86] absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter news (e.g. Dow, NQ, Gold, Fed)..."
            className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#2962FF] focus:outline-hidden rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-[#787b86] transition-colors font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-[#787b86] hover:text-white p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              selectedCategory === 'all'
                ? 'bg-[#2962FF] text-white shadow-xs'
                : 'bg-[#131722] text-[#787b86] hover:text-[#d1d4dc] border border-[#2a2e39]'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            All Wire ({articles.length})
          </button>

          <button
            onClick={() => setSelectedCategory('ym')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              selectedCategory === 'ym'
                ? 'bg-amber-500 text-black font-bold shadow-xs'
                : 'bg-[#131722] text-[#787b86] hover:text-amber-400 border border-[#2a2e39]'
            }`}
          >
            <span>🚀/🪙</span>
            YM (Dow)
          </button>

          <button
            onClick={() => setSelectedCategory('nq')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              selectedCategory === 'nq'
                ? 'bg-cyan-500 text-black font-bold shadow-xs'
                : 'bg-[#131722] text-[#787b86] hover:text-cyan-400 border border-[#2a2e39]'
            }`}
          >
            <span>🚀/🪙</span>
            NQ (Nasdaq)
          </button>

          <button
            onClick={() => setSelectedCategory('gc')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              selectedCategory === 'gc'
                ? 'bg-yellow-500 text-black font-bold shadow-xs'
                : 'bg-[#131722] text-[#787b86] hover:text-yellow-400 border border-[#2a2e39]'
            }`}
          >
            <span>🚀/🪙</span>
            GC (Gold)
          </button>

          <button
            onClick={() => setSelectedCategory('geopolitics')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              selectedCategory === 'geopolitics'
                ? 'bg-rose-500 text-white font-bold shadow-xs'
                : 'bg-[#131722] text-[#787b86] hover:text-rose-400 border border-[#2a2e39]'
            }`}
          >
            <Globe2 className="w-3 h-3" />
            Geopolitics
          </button>

          <button
            onClick={() => setSelectedCategory('macro')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              selectedCategory === 'macro'
                ? 'bg-emerald-500 text-black font-bold shadow-xs'
                : 'bg-[#131722] text-[#787b86] hover:text-emerald-400 border border-[#2a2e39]'
            }`}
          >
            <Landmark className="w-3 h-3" />
            Fed / Macro
          </button>
        </div>
      </div>

      {/* Articles Feed */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2.5">
        {loading && articles.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center text-xs text-[#787b86]">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
            <p className="font-semibold text-white">Aggregating Financial Headlines...</p>
            <span className="text-[11px] text-[#787b86]">Pulling from MarketWatch, CNBC, Investing.com & Yahoo Finance</span>
          </div>
        ) : error && articles.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#787b86] space-y-2 bg-[#1e222d]/40 rounded-xl p-4 border border-rose-500/30">
            <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
            <p className="font-semibold text-white">{error}</p>
            <button
              onClick={fetchNews}
              className="px-3 py-1.5 rounded-lg bg-[#2962FF] text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#787b86] space-y-2 bg-[#1e222d]/40 rounded-xl p-4 border border-[#2a2e39]">
            <Search className="w-6 h-6 text-[#787b86] mx-auto opacity-50" />
            <p className="font-semibold text-[#d1d4dc]">No stories match your filter</p>
            <p className="text-[11px] text-[#787b86]">Try clearing the search query or switching to "All Wire".</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="px-3 py-1 rounded-md bg-[#1e222d] text-white text-xs font-medium hover:bg-[#2a2e39] border border-[#2a2e39]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredArticles.map((article) => {
            const pubStyle = getPublisherStyle(article.publisher);
            const tags = getArticleTags(article.title, article.publisher);
            const impact = analyzeArticleImpact(article.title, article.publisher);

            return (
              <a
                key={article.uuid}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-3 rounded-xl bg-[#1e222d] hover:bg-[#242836] border border-[#2a2e39] hover:border-[#434855] transition-all duration-150 shadow-xs relative overflow-hidden"
              >
                {/* Meta row: Impact Emoji Badge, Publisher, Tags, and Time */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Primary Symbol Impact Emoji Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 shadow-xs ${
                        impact.primarySentiment === 'bull'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      <span>{impact.primaryEmoji}</span>
                      <span>{impact.summaryBadge}</span>
                    </span>

                    {/* Specific impacted user symbols */}
                    {impact.impactedSymbols.map((sym) => (
                      <span
                        key={sym.symbol}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                          sym.sentiment === 'bull'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/40'
                            : 'bg-amber-950/60 text-amber-400 border-amber-700/40'
                        }`}
                        title={`${sym.name}: ${sym.reason}`}
                      >
                        {sym.symbol} {sym.emoji}
                      </span>
                    ))}

                    {/* Publisher Badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono tracking-tight ${pubStyle.bg}`}>
                      {article.publisher}
                    </span>

                    {/* Topic/Category Tags */}
                    {tags.slice(0, 1).map((t, i) => (
                      <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${t.bg} ${t.color}`}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>

                  {/* Relative Time */}
                  <span className="text-[10px] text-[#787b86] font-mono flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3 text-[#787b86]" />
                    {formatTimeAgo(article.providerPublishTime)}
                  </span>
                </div>

                {/* Article Headline */}
                <h4 className="text-xs font-semibold text-white group-hover:text-blue-400 leading-snug transition-colors line-clamp-3">
                  {article.title}
                </h4>

                {/* Bottom Row: Read Full Link Indicator & Impact Explanation */}
                <div className="mt-2.5 pt-2 border-t border-[#2a2e39]/60 flex items-center justify-between text-[10px] text-[#787b86] font-mono">
                  <span className="flex items-center gap-1 group-hover:text-white transition-colors">
                    Read Coverage
                    <ExternalLink className="w-2.5 h-2.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                  <span className="text-[9px] text-[#787b86] truncate max-w-[220px]">
                    {impact.impactedSymbols[0]?.reason || 'Financial Press'}
                  </span>
                </div>
              </a>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="h-8 px-3 border-t border-[#2a2e39] bg-[#131722] flex items-center justify-between text-[10px] font-mono text-[#787b86] shrink-0">
        <span>Showing {filteredArticles.length} stories</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Auto-updates every 60s
        </span>
      </div>
    </div>
  );
};
