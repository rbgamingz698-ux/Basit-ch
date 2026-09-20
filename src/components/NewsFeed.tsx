import React, { useState, useEffect } from 'react';
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
    horizontal?: boolean;
    onNewNews?: (item: NewsItem) => void;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ horizontal, onNewNews }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const lastNewsRef = React.useRef<Set<string>>(new Set());
  const onNewNewsRef = React.useRef(onNewNews);
  onNewNewsRef.current = onNewNews;

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/geopolitics-news');
        if (!res.ok) throw new Error('Failed to fetch news');
        const data = await res.json();

        if (data.news && Array.isArray(data.news)) {
          const newNews = data.news.map((n: any, idx: number) => {
            let timestampStr = 'Live';
            if (n.providerPublishTime) {
              const pubDate = new Date(n.providerPublishTime * 1000);
              const pktPub = getPktDate(pubDate);
              const month = String(pktPub.getMonth() + 1).padStart(2, '0');
              const day = String(pktPub.getDate()).padStart(2, '0');
              timestampStr = `${month}-${day}`;
            }

            return {
              title: n.title || 'News Update',
              publisher: n.publisher || 'Source',
              link: n.link || '#',
              uuid: n.uuid || `news-${idx}`,
              pktDateTime: timestampStr,
            };
          });

          // Detect new news
          if (onNewNewsRef.current && newNews.length > 0) {
            const latest = newNews[0];
            if (!lastNewsRef.current.has(latest.uuid)) {
                // Only notify if we have already loaded news at least once
                if (lastNewsRef.current.size > 0) {
                    onNewNewsRef.current(latest);
                }
                // Add all new news to our tracked set so we don't notify on old ones later
                newNews.forEach((item: NewsItem) => lastNewsRef.current.add(item.uuid));
            }
          } else {
             // Initialize seen news
             newNews.forEach((item: NewsItem) => lastNewsRef.current.add(item.uuid));
          }

          setNews(newNews);
        } else {
          setNews([]);
        }
      } catch (err) {
        console.error('Error loading news:', err);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`h-full flex flex-col ${horizontal ? 'overflow-x-auto' : 'overflow-y-auto'} bg-[#1e222d] border border-[#2a2e39] rounded-xl p-2`}>
      <div className={`flex ${horizontal ? 'flex-row gap-3' : 'flex-col'} divide-y divide-[#2a2e39]`}>
        {loading ? (
          <div className="text-[10px] p-2 italic text-[#787b86]">Loading news...</div>
        ) : news.length === 0 ? (
          <div className="text-[10px] p-2 italic text-[#787b86]">No news found.</div>
        ) : (
          news.map((item, idx) => (
            <div key={`${item.uuid}-${idx}`} className="p-3 hover:bg-[#2a2e39]/30 transition-colors">
              <a 
                href={item.link} 
                target="_blank" 
                referrerPolicy="no-referrer"
                className="text-[11px] font-bold text-[#d1d4dc] hover:text-[#2962FF] line-clamp-2 block leading-snug"
              >
                {item.title}
              </a>
              <div className="text-[9px] text-[#787b86] mt-1.5 flex items-center gap-2">
                <span className="bg-[#131722] px-1.5 py-0.5 rounded border border-[#2a2e39] font-mono text-[9px] text-[#2962FF]">
                  {item.publisher}
                </span>
                <span>•</span>
                {item.pktDateTime}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};




