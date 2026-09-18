/**
 * Real-Time Stock / Wall Street & Geopolitical Tension News Feed
 *
 * Separate from forexNews.ts (which is the scheduled economic CALENDAR:
 * NFP, CPI, FOMC dates). This file is for live market HEADLINES:
 * - Wall Street / Nasdaq / Dow / S&P futures moves
 * - Fed commentary & rate-hike reaction stories
 * - Oil, yields, gold headline drivers
 * - Geopolitical tension stories that move markets (war, sanctions,
 *   trade conflict, Middle East, Russia-Ukraine, China-Taiwan, etc.)
 *
 * Source: Yahoo Finance search endpoint (query2.finance.yahoo.com), routed
 * through a public CORS proxy since Yahoo does not send CORS headers.
 * Falls back to the Yahoo RSS headline feed for ^IXIC if the primary
 * source fails or returns nothing.
 */

import { StockNewsItem } from '../types/chart';

const YAHOO_SEARCH_URL =
  'https://query2.finance.yahoo.com/v1/finance/search?q=stock%20market%20wall%20street&newsCount=40';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const RSS_BACKUP_URL =
  'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EIXIC';

export const MAX_STOCK_NEWS_ITEMS = 20;

// Keywords that flag a headline as geopolitical-tension related.
// Used only to TAG items (isGeopolitical), never to exclude anything —
// general Wall St / Fed / stock headlines are always shown too.
export const GEOPOLITICAL_KEYWORDS = [
  'war',
  'sanction',
  'tension',
  'conflict',
  'strike',
  'attack',
  'military',
  'missile',
  'ceasefire',
  'invasion',
  'troops',
  'geopolitic',
  'middle east',
  'russia',
  'ukraine',
  'israel',
  'gaza',
  'iran',
  'china',
  'taiwan',
  'north korea',
  'tariff',
  'trade war',
  'embargo',
];

export type StockNewsCategory = 'all' | 'market' | 'geopolitical';

function formatTimeDate(epochMs: number): { formattedTime: string; formattedDate: string } {
  const d = new Date(epochMs);
  const formattedTime = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const formattedDate = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return { formattedTime, formattedDate };
}

function isGeopolitical(title: string): boolean {
  const t = title.toLowerCase();
  return GEOPOLITICAL_KEYWORDS.some((kw) => t.includes(kw));
}

interface RawYahooNewsItem {
  uuid?: string;
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: number;
}

function parseYahooSearchJson(json: any): StockNewsItem[] {
  const items: RawYahooNewsItem[] = Array.isArray(json?.news) ? json.news : [];
  return items
    .filter((item) => !!item.title && !!item.link)
    .map((item) => {
      const publishedAt = item.providerPublishTime
        ? item.providerPublishTime * 1000
        : Date.now();
      const { formattedTime, formattedDate } = formatTimeDate(publishedAt);
      return {
        id: item.uuid || item.link!,
        title: item.title!,
        source: item.publisher || 'Unknown',
        link: item.link!,
        publishedAt,
        formattedTime,
        formattedDate,
      };
    });
}

function parseYahooRssXml(xmlText: string): StockNewsItem[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const nodes = Array.from(xml.querySelectorAll('item'));
  return nodes
    .map((node) => {
      const title = node.querySelector('title')?.textContent || '';
      const link = node.querySelector('link')?.textContent || '';
      const pubDate = node.querySelector('pubDate')?.textContent || '';
      const source =
        node.getElementsByTagName('source')?.[0]?.textContent || 'Yahoo Finance';
      const publishedAt = pubDate ? new Date(pubDate).getTime() : Date.now();
      const { formattedTime, formattedDate } = formatTimeDate(publishedAt);
      return {
        id: link,
        title,
        source,
        link,
        publishedAt,
        formattedTime,
        formattedDate,
      };
    })
    .filter((n) => !!n.title && !!n.link);
}

async function fetchViaProxy(targetUrl: string): Promise<Response> {
  const res = await fetch(CORS_PROXY + encodeURIComponent(targetUrl));
  if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
  return res;
}

/**
 * Fetch stock / Wall Street / geopolitical headline news.
 *
 * @param category
 *   'all'          -> everything (market + geopolitical mixed, newest first)
 *   'market'       -> only non-geopolitical market headlines
 *   'geopolitical' -> only headlines flagged as geopolitical tension
 */
export async function fetchStockNews(
  category: StockNewsCategory = 'all'
): Promise<StockNewsItem[]> {
  let items: StockNewsItem[] = [];

  try {
    const res = await fetchViaProxy(YAHOO_SEARCH_URL);
    const json = await res.json();
    items = parseYahooSearchJson(json);
    if (items.length === 0) throw new Error('Primary source returned no items');
  } catch (primaryErr) {
    try {
      const res = await fetchViaProxy(RSS_BACKUP_URL);
      const text = await res.text();
      items = parseYahooRssXml(text);
      if (items.length === 0) throw new Error('Backup source returned no items');
    } catch (backupErr: any) {
      throw new Error(
        `Both sources failed. Primary: ${(primaryErr as Error).message}. Backup: ${backupErr.message}`
      );
    }
  }

  const sorted = items.sort((a, b) => b.publishedAt - a.publishedAt);

  const filtered =
    category === 'all'
      ? sorted
      : category === 'geopolitical'
      ? sorted.filter((n) => isGeopolitical(n.title))
      : sorted.filter((n) => !isGeopolitical(n.title));

  return filtered.slice(0, MAX_STOCK_NEWS_ITEMS);
}

/** Convenience helper exposed for UI badges (e.g. a small "Geo" tag on a card). */
export { isGeopolitical };
