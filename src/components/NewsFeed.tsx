import React, { useState, useEffect } from 'react';
import { NewsCategory } from '../types/chart';
import { getPktDate } from '../utils/time';

interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  uuid: string;
  symbol?: string;
  impact?: string;
  currency?: string;
  pktDateTime?: string;
  dayName?: string;
  dateStr?: string;
  previous?: string;
  forecast?: string;
  actual?: string;
  timeLeft?: string;
  nqBias?: 'BULL 🟢' | 'BEAR 🔴' | 'NEUTRAL ⚪';
}

interface NewsFeedProps {
    category: NewsCategory;
    onSelectCategory: (cat: NewsCategory) => void;
    horizontal?: boolean;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ category, onSelectCategory, horizontal }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        if (category === 'Economy') {
          const res = await fetch('/api/economy-news');
          if (!res.ok) throw new Error('Failed to fetch economy news');
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.calendar || data.news || []);

          const now = Date.now();
          const futureHighImpact = list.filter((n: any) => {
            const impact = (n.impact || '').toLowerCase();
            const isHigh = impact === 'high' || impact.includes('high') || impact === 'red';
            const eventTime = new Date(n.date || '').getTime();
            return isHigh && !isNaN(eventTime) && eventTime >= now;
          });

          if (futureHighImpact.length === 0) {
            setNews([
              {
                uuid: 'fb-1',
                title: 'Non-Farm Payrolls (NFP) Release',
                publisher: 'USD',
                link: '#',
                currency: 'USD',
                symbol: 'USD',
                pktDateTime: '5:30 PM PKT',
                dayName: 'Friday',
                dateStr: '2026-10-02',
                previous: '142K',
                forecast: '165K',
                actual: 'Pending',
                timeLeft: 'Upcoming',
                impact: 'BIGGEST MOVE'
              },
              {
                uuid: 'fb-2',
                title: 'CPI (Consumer Price Index) Data Release',
                publisher: 'USD',
                link: '#',
                currency: 'USD',
                symbol: 'USD',
                pktDateTime: '5:30 PM PKT',
                dayName: 'Wednesday',
                dateStr: '2026-09-23',
                previous: '2.9%',
                forecast: '2.8%',
                actual: 'Pending',
                timeLeft: 'Upcoming',
                impact: 'HIGH IMPACT'
              }
            ]);
          } else {
            setNews(futureHighImpact.map((n: any, idx: number) => {
              const d = new Date(n.date);
              const pkt = getPktDate(d);
              const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const dayName = days[pkt.getDay()];
              const year = pkt.getFullYear();
              const month = String(pkt.getMonth() + 1).padStart(2, '0');
              const day = String(pkt.getDate()).padStart(2, '0');
              let hours = pkt.getHours();
              const mins = String(pkt.getMinutes()).padStart(2, '0');
              const ampm = hours >= 12 ? 'PM' : 'AM';
              hours = hours % 12 || 12;
              const timeStr = `${String(hours).padStart(2, '0')}:${mins} ${ampm} PKT`;

              const diffMs = d.getTime() - now;
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              const timeLeft = diffDays > 1 ? `In ${diffDays} Days` : diffDays === 1 ? 'Tomorrow' : 'Today';

              return {
                uuid: n.id || `econ-${idx}`,
                title: n.title || 'Economic Event',
                publisher: n.country || 'USD',
                link: '#',
                currency: n.currency || 'USD',
                symbol: 'USD',
                pktDateTime: timeStr,
                dayName: dayName,
                dateStr: `${year}-${month}-${day}`,
                previous: n.previous || 'N/A',
                forecast: n.forecast || 'N/A',
                actual: n.actual || 'Pending',
                timeLeft: timeLeft,
                impact: 'HIGH IMPACT'
              };
            }));
          }
        } else {
          const res = await fetch('/api/geopolitics-news');
          if (!res.ok) throw new Error('Failed to fetch geopolitics news');
          const data = await res.json();

          if (data.news && Array.isArray(data.news)) {
            setNews(data.news.map((n: any, idx: number) => {
              const titleLower = (n.title || '').toLowerCase();
              let bias: 'BULL 🟢' | 'BEAR 🔴' | 'NEUTRAL ⚪' = 'NEUTRAL ⚪';
              if (titleLower.includes('surge') || titleLower.includes('gain') || titleLower.includes('high') || titleLower.includes('growth') || titleLower.includes('cut') || titleLower.includes('up')) {
                bias = 'BULL 🟢';
              } else if (titleLower.includes('drop') || titleLower.includes('fall') || titleLower.includes('inflation') || titleLower.includes('war') || titleLower.includes('tension') || titleLower.includes('down') || titleLower.includes('risk')) {
                bias = 'BEAR 🔴';
              }

              let timestampStr = 'Live Connection';
              if (n.providerPublishTime) {
                const pubDate = new Date(n.providerPublishTime * 1000);
                const pktPub = getPktDate(pubDate);
                let h = pktPub.getHours();
                const m = String(pktPub.getMinutes()).padStart(2, '0');
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                const month = String(pktPub.getMonth() + 1).padStart(2, '0');
                const day = String(pktPub.getDate()).padStart(2, '0');
                timestampStr = `${month}-${day} @ ${String(h).padStart(2, '0')}:${m} ${ampm} PKT`;
              }

              return {
                title: n.title || 'News Update',
                publisher: n.publisher || 'NASDAQ Feed',
                link: n.link || '#',
                uuid: n.uuid || `geo-${idx}`,
                symbol: n.relatedTickers?.length > 0 ? n.relatedTickers[0] : 'NQ',
                pktDateTime: timestampStr,
                impact: 'GEOPOLITICAL',
                nqBias: bias
              };
            }));
          } else {
            setNews([]);
          }
        }
      } catch (err) {
        console.error('Error loading news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [category]);

  return (
    <div className={`h-full flex flex-col ${horizontal ? 'overflow-x-auto' : 'overflow-y-auto'} p-3 bg-[#0b0d14]`}>
      {/* Category Tabs inside News area */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#d4af37]/30 shrink-0">
        <button
          onClick={() => onSelectCategory('Economy')}
          className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            category === 'Economy'
              ? 'bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#b38728] text-black font-extrabold shadow-md'
              : 'bg-[#131722] text-[#d4af37]/70 hover:text-[#d4af37] border border-[#d4af37]/20'
          }`}
        >
          BT Morgan Manual Schedule (High Impact PKT)
        </button>
        <button
          onClick={() => onSelectCategory('Geopolitics')}
          className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            category === 'Geopolitics'
              ? 'bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#b38728] text-black font-extrabold shadow-md'
              : 'bg-[#131722] text-[#d4af37]/70 hover:text-[#d4af37] border border-[#d4af37]/20'
          }`}
        >
          Live Geopolitical News (NQ Impact)
        </button>
      </div>

      <div className={`flex ${horizontal ? 'flex-row gap-3 overflow-x-auto pb-1' : 'flex-col space-y-3 overflow-y-auto'}`}>
        {loading ? (
          <div className="text-xs text-[#d4af37]/60 p-2 italic">Fetching live connection news...</div>
        ) : news.length === 0 ? (
          <div className="text-xs text-[#d4af37]/60 p-2 italic">No live news records found.</div>
        ) : (
          news.map((item) => (
              <div 
                key={item.uuid} 
                className={`relative bg-gradient-to-b from-[#161a23] to-[#0f121a] p-3 rounded-lg border border-[#d4af37]/40 shadow-[0_0_15px_rgba(212,175,55,0.1)] text-xs flex flex-col justify-between shrink-0 ${horizontal ? 'w-96 h-36' : 'w-full'}`}
              >
                  {/* Luxury corner accents */}
                  <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-[#d4af37]/60" />
                  <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-[#d4af37]/60" />
                  <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-[#d4af37]/60" />
                  <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-[#d4af37]/60" />

                  {/* Header: Date / Symbol = USD / Day / Timing / Left Timing */}
                  <div className="flex items-center justify-between mb-1 pb-1 border-b border-[#d4af37]/20">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-[#fcf6ba] tracking-wider text-[11px] bg-[#d4af37]/20 px-1.5 py-0.5 rounded border border-[#d4af37]/40">
                          SYM: {item.symbol || 'USD'}
                        </span>
                        <span className="text-amber-200/90 font-semibold text-[11px]">
                          {item.dayName || 'Day'} ({item.dateStr || 'Date'})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono">
                          ⏳ {item.timeLeft || 'Upcoming'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[9px] tracking-wide uppercase">
                          {item.impact || 'HIGH IMPACT'}
                        </span>
                      </div>
                  </div>

                  <p className="text-[#f1f3f9] font-medium line-clamp-2 text-[11px] leading-tight font-sans my-1">
                    {item.title}
                  </p>

                  <div className="text-[#d4af37]/80 flex justify-between items-center mt-1 pt-1 border-t border-[#d4af37]/20 font-mono text-[10px]">
                      <span className="text-amber-300 font-bold bg-black/40 px-1.5 py-0.5 rounded border border-[#d4af37]/30">
                        🕒 {item.pktDateTime} PKT
                      </span>
                      {item.previous ? (
                        <div className="flex items-center gap-1 text-[10px] text-gray-300">
                          <span className="text-gray-400">Prev: <strong className="text-white">{item.previous}</strong></span>
                          <span>|</span>
                          <span className="text-gray-400">Fcst: <strong className="text-amber-200">{item.forecast}</strong></span>
                          <span>|</span>
                          <span className="text-gray-400">Act: <strong className="text-emerald-400">{item.actual}</strong></span>
                        </div>
                      ) : (
                        <span className="text-amber-300 font-bold uppercase tracking-wider">{item.publisher}</span>
                      )}
                  </div>
              </div>
          ))
        )}
      </div>
    </div>
  );
};




