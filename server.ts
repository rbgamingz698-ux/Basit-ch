import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Parser from "rss-parser";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let cache: { data: any; timestamp: number } | null = null;
  const CACHE_TTL = 60 * 60 * 1000; // 1 hour

  let yahooCache: { data: any; timestamp: number } | null = null;
  const YAHOO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (as requested)

  // Gemini Chat endpoint with robust fallback
  app.post("/api/gemini-chat", async (req, res) => {
    try {
      const { message, history, modelType } = req.body;
      let modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
      if (modelType === 'pro') modelsToTry = ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
      if (modelType === 'lite') modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

      const contents: any[] = [];
      if (history && Array.isArray(history)) {
        for (const h of history) {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
          });
        }
      }
      contents.push({ role: 'user', parts: [{ text: message }] });

      const systemInstruction = "You are BT Morgan AI, an expert quantitative trading assistant and terminal guide for US30 (Dow Jones) and NASDAQ (US100) traders. You help users explore the app, analyze candlestick charts, interpret technical indicators (Moving Averages, RSI, MACD, Bollinger Bands), understand upcoming economic calendar releases (NFP, CPI, PPI, FOMC), and manage risk. Be professional, concise, and knowledgeable.";

      let response: any = null;
      let lastError: any = null;

      for (const m of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: m,
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
            }
          });
          if (response && response.text) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${m} failed or hit quota limit, trying next...`, err.message);
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error("All Gemini models encountered rate limits or errors.");
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini chat error:", error);
      const isQuota = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED') || error.status === 429;
      const errorMsg = isQuota
        ? "⚠️ Gemini AI Free Tier quota limit reached (429 Rate Limit). Please wait a moment or try again shortly."
        : (error.message || "Failed to generate AI response");
      res.status(200).json({ text: errorMsg });
    }
  });

  // Server-side Yahoo chart proxy (essential for production builds)
  app.get("/api/chart", async (req, res) => {
    try {
      let symbol = (req.query.symbol as string) || "^DJI";
      const interval = (req.query.interval as string) || "5m";
      const range = (req.query.range as string) || (interval === "1m" ? "1d" : "5d");

      // Normalize symbol shorthand
      if (symbol === "US30") symbol = "^DJI";
      if (symbol === "NASDAQ" || symbol === "US100") symbol = "^IXIC";
      if (symbol === "BT_GC=F") symbol = "GC=F";

      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;

      const response = await fetch(yahooUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Yahoo API returned error ${response.status}` });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error("Yahoo Chart Proxy Error:", err);
      res.status(500).json({ error: err?.message || "Server error" });
    }
  });

  // API route to fetch data server-side, bypassing client CORS
  app.get("/api/economy-news", async (req, res) => {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      console.log('Returning cached news data');
      return res.json(cache.data);
    }
    
    try {
      console.log('Fetching fresh news data');
      const response = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://www.forexfactory.com/',
          'Origin': 'https://www.forexfactory.com/'
        }
      });
      
      if (response.status === 429) {
          console.warn('Rate limited by API, returning cached data or empty list');
          return res.json(cache ? cache.data : []);
      }
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      
      cache = { data, timestamp: Date.now() };
      res.json(data);
    } catch (error) {
      console.error('Error fetching news:', error);
      // Return cached data if available on error, otherwise empty list
      res.json(cache ? cache.data : []);
    }
  });

  const parser = new Parser({
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });

  async function fetchRssFeed(url: string, sourceName: string, publisherName: string) {
    try {
      const feed = await parser.parseURL(url);
      return (feed.items || []).map(item => ({
        title: item.title || '',
        publisher: publisherName,
        link: item.link || '#',
        uuid: item.guid || item.id || `feed-${sourceName}-${Math.random()}`,
        relatedTickers: [],
        providerPublishTime: item.isoDate ? Math.floor(new Date(item.isoDate).getTime() / 1000) : Math.floor(Date.now() / 1000)
      }));
    } catch (e) {
      console.warn(`Failed to fetch RSS feed ${sourceName}:`, e);
      return [];
    }
  }

  async function fetchYahooSearch(query: string, newsCount: number = 20) {
    try {
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=${newsCount}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) return [];
      const json: any = await res.json();
      return (json.news || []).map((item: any, idx: number) => ({
        title: item.title || '',
        publisher: item.publisher || 'Yahoo Finance',
        link: item.link || '#',
        uuid: item.uuid || `yf-json-${query}-${idx}`,
        relatedTickers: item.relatedTickers || [query],
        providerPublishTime: item.providerPublishTime || Math.floor(Date.now() / 1000)
      }));
    } catch (e) {
      console.warn(`Failed to fetch Yahoo JSON for query ${query}:`, e);
      return [];
    }
  }

  app.get("/api/geopolitics-news", async (req, res) => {
    if (yahooCache && Date.now() - yahooCache.timestamp < YAHOO_CACHE_TTL) {
      console.log('Returning cached multi-source news data');
      return res.json(yahooCache.data);
    }
    
    try {
      console.log('Fetching fresh multi-source news data');
      const rssFeeds = [
        fetchRssFeed("https://finance.yahoo.com/news/rssindex", "Yahoo Finance RSS", "Yahoo Finance"),
        fetchRssFeed("https://feeds.content.dowjones.io/public/rss/mw_topstories", "MarketWatch RSS", "MarketWatch"),
        fetchRssFeed("https://www.cnbc.com/id/100003114/device/rss/rss.html", "CNBC RSS", "CNBC"),
        fetchRssFeed("https://www.investing.com/rss/news_301.rss", "Investing.com RSS", "Investing.com")
      ];

      const queries = ["^DJI", "^IXIC", "GC=F", "XAUUSD=X", "wall street"];
      const searchFetches = queries.map(q => {
        // Use 30 for wall street as requested, and 20 for others
        const count = q === "wall street" ? 30 : 20;
        return fetchYahooSearch(q, count);
      });

      const results = await Promise.allSettled([...rssFeeds, ...searchFetches]);
      const merged: any[] = [];

      for (const r of results) {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          merged.push(...r.value);
        }
      }

      // Deduplicate by normalized lower-case title (alphanumeric only)
      const seen = new Set<string>();
      const deduped: any[] = [];

      for (const item of merged) {
        const normTitle = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normTitle) continue;
        if (!seen.has(normTitle)) {
          seen.add(normTitle);
          deduped.push(item);
        }
      }

      // Sort by providerPublishTime, newest first
      deduped.sort((a, b) => b.providerPublishTime - a.providerPublishTime);

      // Keep top 40 news items
      const topNews = deduped.slice(0, 40);

      // Map back to yahoo news structure
      const formattedNews = topNews.map(n => ({
        title: n.title,
        publisher: n.publisher,
        link: n.link,
        uuid: n.uuid,
        relatedTickers: n.relatedTickers,
        providerPublishTime: n.providerPublishTime
      }));

      yahooCache = { data: { news: formattedNews }, timestamp: Date.now() };
      res.json(yahooCache.data);
    } catch (error) {
      console.error('Error fetching unified news:', error);
      res.json(yahooCache ? yahooCache.data : { news: [] });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
