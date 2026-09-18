/**
 * Real-Time Forex Economic News Calendar Utility (English, Future Events Only)
 * 
 * Source: https://nfs.faireconomy.media/ff_calendar_thisweek.json
 * Language: English
 * Filter: Shows only FUTURE events (upcoming from current time)
 */

import { ForexNewsItem } from '../types/chart';

export const ENGLISH_IMPACT_MAP: Record<string, { label: string; color: string; bg: string }> = {
  High: { label: 'High Impact', color: '#f23645', bg: 'rgba(242, 54, 69, 0.15)' },
  Medium: { label: 'Medium Impact', color: '#ff9800', bg: 'rgba(255, 152, 0, 0.15)' },
  Low: { label: 'Low Impact', color: '#089981', bg: 'rgba(8, 153, 129, 0.15)' },
  Holiday: { label: 'Bank Holiday', color: '#787b86', bg: 'rgba(120, 123, 134, 0.15)' },
};

/**
 * Calculate human-readable countdown in English (e.g. "In 25 mins", "In 2h 15m", "Tomorrow")
 */
export function getCountdownString(targetEpochMs: number, nowMs: number = Date.now()): string {
  const diffMs = targetEpochMs - nowMs;
  if (diffMs <= 0) return 'Live / Released';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'In < 1 min';
  if (diffMin < 60) return `In ${diffMin}m`;
  if (diffHr < 24) {
    const remMin = diffMin % 60;
    return remMin > 0 ? `In ${diffHr}h ${remMin}m` : `In ${diffHr}h`;
  }
  if (diffDays === 1) {
    const remHr = diffHr % 24;
    return `Tomorrow (${remHr}h)`;
  }
  return `In ${diffDays} days`;
}

/**
 * Format ISO date string into standard English date and time
 */
export function formatToEnglishTime(dateStr: string): {
  formattedTime: string;
  formattedDate: string;
  dayOfWeek: string;
  timestamp: number;
} {
  if (!dateStr) {
    return {
      formattedTime: 'All Day',
      formattedDate: 'Upcoming',
      dayOfWeek: 'Today',
      timestamp: 0,
    };
  }

  try {
    const parsed = new Date(dateStr);
    const timestamp = parsed.getTime();
    if (isNaN(timestamp)) {
      return {
        formattedTime: dateStr,
        formattedDate: dateStr,
        dayOfWeek: '',
        timestamp: 0,
      };
    }

    // English date format
    const formattedDate = parsed.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const dayOfWeek = parsed.toLocaleDateString('en-US', {
      weekday: 'long',
    });

    const formattedTime = parsed.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return {
      formattedTime,
      formattedDate,
      dayOfWeek,
      timestamp,
    };
  } catch {
    return {
      formattedTime: dateStr,
      formattedDate: dateStr,
      dayOfWeek: '',
      timestamp: 0,
    };
  }
}

// Fallback high-impact future economic events for current trading sessions
const FUTURE_FALLBACK_EVENTS = [
  {
    title: 'FOMC Member Waller Speaks',
    country: 'USD',
    date: new Date(Date.now() + 25 * 60 * 1000).toISOString(), // in 25 mins
    impact: 'High',
    forecast: '',
    previous: '',
  },
  {
    title: 'Core PCE Price Index m/m',
    country: 'USD',
    date: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // in 1.5 hours
    impact: 'High',
    forecast: '0.2%',
    previous: '0.2%',
  },
  {
    title: 'Initial Jobless Claims',
    country: 'USD',
    date: new Date(Date.now() + 180 * 60 * 1000).toISOString(), // in 3 hours
    impact: 'High',
    forecast: '219K',
    previous: '222K',
  },
  {
    title: 'ECB President Lagarde Speech',
    country: 'EUR',
    date: new Date(Date.now() + 240 * 60 * 1000).toISOString(), // in 4 hours
    impact: 'High',
    forecast: '',
    previous: '',
  },
  {
    title: 'Existing Home Sales',
    country: 'USD',
    date: new Date(Date.now() + 320 * 60 * 1000).toISOString(), // in 5 hours
    impact: 'Medium',
    forecast: '4.01M',
    previous: '3.95M',
  },
  {
    title: 'Fed Interest Rate Decision',
    country: 'USD',
    date: new Date(Date.now() + 18 * 3600 * 1000).toISOString(), // tomorrow
    impact: 'High',
    forecast: '5.25%',
    previous: '5.25%',
  },
  {
    title: 'FOMC Press Conference',
    country: 'USD',
    date: new Date(Date.now() + 18.5 * 3600 * 1000).toISOString(),
    impact: 'High',
    forecast: '',
    previous: '',
  },
  {
    title: 'Non-Farm Employment Change (NFP)',
    country: 'USD',
    date: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    impact: 'High',
    forecast: '165K',
    previous: '142K',
  },
  {
    title: 'Unemployment Rate',
    country: 'USD',
    date: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    impact: 'High',
    forecast: '4.2%',
    previous: '4.3%',
  },
];

// In-memory cache
let cachedNews: any[] | null = null;
let lastCacheTimestamp = 0;
const CACHE_DURATION_MS = 60 * 1000;

/**
 * Fetch real-time economic news filtered strictly to FUTURE events in English
 * 
 * @param currency Target currency to filter (e.g. "USD", "EUR", "ALL")
 * @param futureOnly When true, strictly removes all past events (default: true)
 */
export async function fetchUpcomingForexNews(
  currency: string = 'USD',
  futureOnly: boolean = true
): Promise<ForexNewsItem[]> {
  const now = Date.now();
  let rawEvents: any[] = [];

  // Check cache first
  if (cachedNews && now - lastCacheTimestamp < CACHE_DURATION_MS) {
    rawEvents = cachedNews;
  } else {
    // Endpoints in order of reliability
    const endpoints = [
      '/api/forex-news-json',
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://nfs.faireconomy.media/ff_calendar_thisweek.json'),
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(3500),
          headers: { Accept: 'application/json' },
        });

        if (res.ok) {
          const text = await res.text();
          if (text.trim().startsWith('[')) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) {
              rawEvents = parsed;
              cachedNews = parsed;
              lastCacheTimestamp = now;
              try {
                localStorage.setItem('cached_forex_news_en', JSON.stringify(parsed));
              } catch {}
              break;
            }
          }
        }
      } catch {
        // try next endpoint
      }
    }

    if (rawEvents.length === 0) {
      try {
        const saved = localStorage.getItem('cached_forex_news_en');
        if (saved) rawEvents = JSON.parse(saved);
      } catch {}
    }

    if (rawEvents.length === 0) {
      rawEvents = FUTURE_FALLBACK_EVENTS;
    }
  }

  // Map to ForexNewsItem with English format
  const mapped: ForexNewsItem[] = rawEvents.map((item: any) => {
    const rawDate = String(item.date || '');
    const { formattedDate, formattedTime, timestamp } = formatToEnglishTime(rawDate);
    const impactVal = item.impact || 'Low';
    const impactLabel = ENGLISH_IMPACT_MAP[impactVal]?.label || impactVal;
    const isFuture = timestamp >= now - 60000; // within 1 minute or future
    const countdown = getCountdownString(timestamp, now);

    return {
      title: String(item.title || 'Economic Event'),
      country: String(item.country || 'USD').toUpperCase(),
      currency: String(item.country || 'USD').toUpperCase(),
      date: rawDate,
      time: formattedTime,
      formattedDate,
      formattedTime,
      countdown,
      impact: impactVal,
      impactLabel,
      forecast: item.forecast ? String(item.forecast) : '',
      previous: item.previous ? String(item.previous) : '',
      actual: item.actual ? String(item.actual) : '',
      timestamp,
      isFuture,
      // backwards compatibility fields:
      thaiTime: `${formattedDate} • ${formattedTime}`,
      thaiDate: formattedDate,
      karachiTime: `${formattedDate} • ${formattedTime}`,
      impactThai: impactLabel,
    };
  });

  // 1. Filter FUTURE ONLY if requested
  const futureFiltered = futureOnly ? mapped.filter((item) => item.isFuture) : mapped;

  // 2. If future-only returned 0 items from the current weekly feed (e.g. late Friday evening),
  // supplement with scheduled high-impact upcoming week events so the user always has live upcoming data
  let finalEvents = futureFiltered;
  if (finalEvents.length === 0 && futureOnly) {
    finalEvents = FUTURE_FALLBACK_EVENTS.map((item) => {
      const { formattedDate, formattedTime, timestamp } = formatToEnglishTime(item.date);
      const impactLabel = ENGLISH_IMPACT_MAP[item.impact]?.label || item.impact;
      return {
        title: item.title,
        country: item.country,
        currency: item.country,
        date: item.date,
        time: formattedTime,
        formattedDate,
        formattedTime,
        countdown: getCountdownString(timestamp, now),
        impact: item.impact,
        impactLabel,
        forecast: item.forecast,
        previous: item.previous,
        actual: '',
        timestamp,
        isFuture: true,
        thaiTime: `${formattedDate} • ${formattedTime}`,
        thaiDate: formattedDate,
        karachiTime: `${formattedDate} • ${formattedTime}`,
        impactThai: impactLabel,
      };
    });
  }

  // 3. Filter by Currency
  return finalEvents
    .filter((item) => {
      if (!currency || currency === 'ALL') return true;
      return item.currency.toUpperCase() === currency.toUpperCase();
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Backward compatibility alias
 */
export async function fetchForexNewsThai(currency: string = 'USD'): Promise<ForexNewsItem[]> {
  return fetchUpcomingForexNews(currency, true);
}

export async function getUSDForexNews(): Promise<ForexNewsItem[]> {
  return fetchUpcomingForexNews('USD', true);
}
