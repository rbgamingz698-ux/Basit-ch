/**
 * Real-Time Forex News Data Fetcher (Node.js)
 * 
 * REQUIREMENTS:
 * 1. Fetch XML from: https://nfs.faireconomy.media/ff_calendar_thisweek.xml
 * 2. Parse XML to JSON
 * 3. Convert date to Asia/Karachi timezone
 * 4. Filter: currency = "USD"
 * 
 * Usage:
 *   node fetchForexNews.js
 * Or import in Node:
 *   import { fetchRealTimeForexNews } from './fetchForexNews.js';
 */

import { XMLParser } from 'fast-xml-parser';

/**
 * Format an ISO or event date string to Asia/Karachi timezone
 * @param {string} dateStr - Date string e.g. "09-18-2026" or "Sep 18, 2026"
 * @param {string} timeStr - Time string e.g. "8:30am" or "1:00pm"
 * @returns {string} Formatted date in Asia/Karachi timezone
 */
function convertToKarachiTime(dateStr, timeStr) {
  try {
    if (!dateStr) return 'N/A';
    
    // Normalize date parts
    // XML format typically is: <date>09-18-2026</date> and <time>8:30am</time>
    let combinedStr = dateStr;
    if (timeStr && timeStr !== 'All Day' && timeStr !== 'Tentative') {
      combinedStr = `${dateStr} ${timeStr}`;
    }

    const parsedDate = new Date(combinedStr);
    if (isNaN(parsedDate.getTime())) {
      // Fallback: try parsing with standard format or return raw string with label
      return `${dateStr} ${timeStr || ''} (Asia/Karachi)`;
    }

    // Convert to Asia/Karachi timezone (UTC+5)
    const karachiDateString = parsedDate.toLocaleString('en-US', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });

    return karachiDateString;
  } catch {
    return `${dateStr} ${timeStr || ''} [Asia/Karachi]`;
  }
}

/**
 * Main function to fetch, parse, convert, and filter Forex News data
 * @param {object} options
 * @param {string} options.url - Source XML URL
 * @param {string} options.currency - Filter currency (default: 'USD')
 * @returns {Promise<Array<object>>} List of USD economic calendar events with Asia/Karachi time
 */
export async function fetchRealTimeForexNews(options = {}) {
  const url = options.url || 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';
  const targetCurrency = (options.currency || 'USD').toUpperCase();

  console.log(`[ForexNews] Fetching XML from: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; US30LiquidityChartPro/1.0; +https://tradingview.com)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch forex calendar: ${response.status} ${response.statusText}`);
  }

  const xmlText = await response.text();

  // Parse XML to JSON using fast-xml-parser
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
  });

  const parsedJson = parser.parse(xmlText);

  // Navigate to event list (standard Forex Factory structure: <weeklyevents><event>...)
  const rawEvents = parsedJson?.weeklyevents?.event || parsedJson?.events?.event || [];
  const eventsArray = Array.isArray(rawEvents) ? rawEvents : [rawEvents];

  console.log(`[ForexNews] Total events parsed: ${eventsArray.length}`);

  // Filter for target currency (USD) and map dates to Asia/Karachi timezone
  const filteredEvents = eventsArray
    .filter(event => {
      const curr = (event?.country || event?.currency || '').toString().trim().toUpperCase();
      return curr === targetCurrency;
    })
    .map(event => {
      const rawDate = event?.date || '';
      const rawTime = event?.time || '';
      const karachiTime = convertToKarachiTime(rawDate, rawTime);

      return {
        title: event?.title || 'Unknown Event',
        country: event?.country || targetCurrency,
        currency: event?.country || targetCurrency,
        date: rawDate,
        time: rawTime,
        karachiTime: karachiTime,
        impact: event?.impact || 'Medium',
        forecast: event?.forecast || '',
        previous: event?.previous || '',
        actual: event?.actual || ''
      };
    });

  console.log(`[ForexNews] Found ${filteredEvents.length} events for ${targetCurrency}`);
  return filteredEvents;
}

// Auto-run when executed directly via Node.js: `node fetchForexNews.js`
if (process.argv[1] && process.argv[1].endsWith('fetchForexNews.js')) {
  (async () => {
    try {
      const results = await fetchRealTimeForexNews();
      console.log('\n--- FIRST 5 USD EVENTS IN ASIA/KARACHI TIMEZONE ---');
      console.log(JSON.stringify(results.slice(0, 5), null, 2));
    } catch (err) {
      console.error('[ForexNews Error]', err.message);
    }
  })();
}
