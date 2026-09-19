import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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
  const YAHOO_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

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

  app.get("/api/geopolitics-news", async (req, res) => {
    if (yahooCache && Date.now() - yahooCache.timestamp < YAHOO_CACHE_TTL) {
      console.log('Returning cached Yahoo data');
      return res.json(yahooCache.data);
    }
    
    try {
      console.log('Fetching fresh Yahoo data');
      const query = 'NASDAQ 100';
      const targetUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=30`;
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      
      yahooCache = { data, timestamp: Date.now() };
      res.json(data);
    } catch (error) {
      console.error('Error fetching Yahoo data:', error);
      res.json(yahooCache ? yahooCache.data : { news: [] });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
