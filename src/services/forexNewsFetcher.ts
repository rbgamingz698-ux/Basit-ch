import { XMLParser } from 'fast-xml-parser';

export interface ForexNewsItemUSD {
  title: string;
  country: string;
  date: string;
  time: string;
  karachiDateTime: string;
  impact: string;
  forecast: string;
  previous: string;
}

/**
 * Fetches real-time forex economic calendar news data from ForexFactory XML feed,
 * parses it to JSON, converts timestamps to the Asia/Karachi (UTC+5) timezone,
 * and filters strictly for USD currency events.
 *
 * @returns Promise<ForexNewsItemUSD[]>
 */
export async function fetchRealTimeForexNewsUSD(): Promise<ForexNewsItemUSD[]> {
  const url = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ForexNewsFetcher/1.0)',
      'Accept': 'application/xml, text/xml, */*'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Forex calendar: HTTP ${response.status} ${response.statusText}`);
  }

  const xmlText = await response.text();

  // Parse XML to JavaScript Object / JSON
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
  });

  const parsedJson = parser.parse(xmlText);
  const rawEvents = parsedJson?.weeklyevents?.event ?? [];
  const eventList = Array.isArray(rawEvents) ? rawEvents : [rawEvents];

  // Filter for currency = "USD" and convert date/time to Asia/Karachi timezone
  const usdEvents: ForexNewsItemUSD[] = eventList
    .filter((event: any) => String(event?.country || '').trim().toUpperCase() === 'USD')
    .map((event: any) => {
      const rawDate = String(event.date || '').trim(); // e.g. "09-18-2026" (MM-DD-YYYY)
      const rawTime = String(event.time || '').trim(); // e.g. "8:30am" or "All Day"

      let karachiDateTime = 'All Day';

      if (rawDate) {
        try {
          // ForexFactory XML date format is MM-DD-YYYY
          const parts = rawDate.split('-');
          let isoDate = rawDate;
          if (parts.length === 3) {
            const [mm, dd, yyyy] = parts;
            isoDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
          }

          let timePart = '00:00:00';
          const isAllDay = !rawTime || rawTime.toLowerCase().includes('day') || rawTime.toLowerCase().includes('tentative');

          if (!isAllDay) {
            const match = rawTime.match(/(\d+):(\d+)(am|pm)/i);
            if (match) {
              let hour = parseInt(match[1], 10);
              const minute = match[2];
              const meridian = match[3].toLowerCase();

              if (meridian === 'pm' && hour < 12) hour += 12;
              if (meridian === 'am' && hour === 12) hour = 0;

              timePart = `${String(hour).padStart(2, '0')}:${minute}:00`;
            }
          }

          // ForexFactory XML timestamps are in US Eastern Time (EDT/EST)
          // Constructing date and localizing to Asia/Karachi (UTC+5)
          const parsedDate = new Date(`${isoDate}T${timePart}`);
          if (!isNaN(parsedDate.getTime())) {
            karachiDateTime = parsedDate.toLocaleString('en-US', {
              timeZone: 'Asia/Karachi',
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: isAllDay ? undefined : '2-digit',
              minute: isAllDay ? undefined : '2-digit',
              hour12: true,
            });
          } else {
            karachiDateTime = `${rawDate} ${rawTime}`;
          }
        } catch {
          karachiDateTime = `${rawDate} ${rawTime}`;
        }
      }

      return {
        title: String(event.title || 'Economic Event'),
        country: 'USD',
        date: rawDate,
        time: rawTime,
        karachiDateTime,
        impact: String(event.impact || 'Low'),
        forecast: String(event.forecast || ''),
        previous: String(event.previous || ''),
      };
    });

  return usdEvents;
}
