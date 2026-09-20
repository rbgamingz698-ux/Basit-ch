import React, { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Newspaper, Clock, Zap } from 'lucide-react';

interface NewsNotificationProps {
  item: {
    title: string;
    publisher?: string;
    link?: string;
    uuid?: string;
    pktDateTime?: string;
    impact?: string;
  } | null;
  onClose: () => void;
  durationSeconds?: number;
}

export const NewsNotification: React.FC<NewsNotificationProps> = ({
  item,
  onClose,
  durationSeconds = 10,
}) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [progress, setProgress] = useState(100);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const itemId = item ? (item.uuid || item.title) : null;

  useEffect(() => {
    if (!itemId) return;

    setTimeLeft(durationSeconds);
    setProgress(100);

    const startTime = Date.now();
    const durationMs = durationSeconds * 1000;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingMs = Math.max(0, durationMs - elapsed);
      const remainingSec = Math.ceil(remainingMs / 1000);
      const progressPct = Math.max(0, (remainingMs / durationMs) * 100);

      setTimeLeft(remainingSec);
      setProgress(progressPct);

      if (remainingMs <= 0) {
        clearInterval(timer);
        onCloseRef.current();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [itemId, durationSeconds]);

  if (!item) return null;

  const isHighImpact = item.impact === 'HIGH' || item.impact === 'Red';

  return (
    <div
      id="news-popup-banner"
      className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-32px)] bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
    >
      {/* Top Countdown Timing Bar */}
      <div className="w-full bg-[#131722] h-1.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#2962FF] to-cyan-400 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-4">
        {/* Header with Timing Badge & Close */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#2962FF]/20 text-[#2962FF] text-[10px] font-bold uppercase tracking-wider">
              <Zap className="w-3 h-3 text-[#2962FF]" />
              BREAKING NEWS
            </span>
            {isHighImpact && (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold uppercase">
                HIGH IMPACT
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 10s Timing countdown */}
            <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md">
              <Clock className="w-3 h-3 text-cyan-400 animate-pulse" />
              {timeLeft}s
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
              title="Close Banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Headline */}
        <a
          href={item.link || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="group block text-[13px] font-semibold text-[#d1d4dc] hover:text-white leading-snug line-clamp-2 transition-colors"
        >
          <span className="group-hover:underline">{item.title || 'Market Update'}</span>
          <ExternalLink className="inline-block w-3 h-3 ml-1.5 text-[#787b86] group-hover:text-cyan-400 transition-colors" />
        </a>

        {/* Footer Meta */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-[#787b86] pt-2 border-t border-[#2a2e39]/60">
          <div className="flex items-center gap-1.5 truncate">
            <Newspaper className="w-3 h-3 text-[#787b86]" />
            <span className="font-medium text-[#b2b5be] truncate">
              {item.publisher || 'Yahoo Finance'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#787b86] shrink-0">
            {item.pktDateTime || 'Just now'}
          </span>
        </div>
      </div>
    </div>
  );
};
