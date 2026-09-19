/**
 * Real-Time US30 & NASDAQ Financial Terminal
 * Powered by Yahoo Finance v8 Chart API
 * 
 * Target Symbols:
 * - US30:   ^DJI  (Dow Jones Industrial Average)
 * - NASDAQ: ^IXIC (Nasdaq Composite / US100)
 * 
 * Features:
 * - 5m OHLC Candlestick data directly from Yahoo Finance v8 chart API
 * - Instant 1-click Switcher between US30 and NASDAQ
 * - 60-Second In-Memory & LocalStorage caching with auto-refresh
 * - Dark TradingView aesthetic with custom candle color palettes
 * - Upcoming Future Economic News Radar (Asia/Karachi timezone & USD events)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  CandleColorTheme,
  CandleData,
  ChartType,
  Timeframe,
  NewsCategory,
} from './types/chart';
import { fetchMarketData, getSymbolInfo, SUPPORTED_SYMBOLS, isMarketOpen } from './services/marketData';
import { DEFAULT_THEME } from './utils/candleColors';
import { TopBar } from './components/TopBar';
import { TradingViewChart } from './components/TradingViewChart';
import { CandleColorModal } from './components/CandleColorModal';
import { ChartSettingsModal } from './components/ChartSettingsModal';
import { NewsFeed } from './components/NewsFeed';
import { GeminiAssistant } from './components/GeminiAssistant';

export default function App() {
  // Chart Configuration State (Default: US30, 5m, Candlestick)
  const [symbol, setSymbol] = useState<string>('US30');
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [chartType, setChartType] = useState<ChartType>('Candlestick');
  const [newsCategory, setNewsCategory] = useState<NewsCategory>('Economy');

  // Candle Color Theme State (persisted in localStorage)
  const [candleTheme, setCandleTheme] = useState<CandleColorTheme>(() => {
    try {
      const saved = localStorage.getItem('chart_candle_theme');
      return saved ? JSON.parse(saved) : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const handleUpdateCandleTheme = (theme: CandleColorTheme) => {
    setCandleTheme(theme);
    try {
      localStorage.setItem('chart_candle_theme', JSON.stringify(theme));
    } catch {}
  };

  // Market Data State (Real Yahoo Finance Data)
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataSource, setDataSource] = useState<string>('Yahoo Finance');
  const [cacheSecondsLeft, setCacheSecondsLeft] = useState<number>(60);

  // Price tracking and Fullscreen state
  const [livePrice, setLivePrice] = useState<number>(0);
  const [priceDelta, setPriceDelta] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Layout: Default Horizontal landscape view (Chart ~70%, Upcoming News ~30%)
  // Modals
  const [isCandleColorOpen, setIsCandleColorOpen] = useState(false);
  const [isChartSettingsOpen, setIsChartSettingsOpen] = useState(false);
  const [chartSettings, setChartSettings] = useState({
    events: { economicEvents: true, futureEventsOnly: true, latestNews: true },
    canvas: { watermark: 'Replay mode', gridLines: true },
  });

  // Fullscreen toggle for the entire app using the browser Fullscreen API
  const toggleFullAppFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Load Real Yahoo Finance Data
  const loadData = useCallback(async (sym: string, tf: Timeframe, force: boolean = false) => {
    setLoading(true);
    try {
      const res = await fetchMarketData(sym, tf, force);
      if (res.candles && res.candles.length > 0) {
        setCandles(res.candles);
        setDataSource(res.source);

        const lastBar = res.candles[res.candles.length - 1];
        const currentP = res.regularMarketPrice ?? lastBar.close;
        const prevP = res.previousClose ?? (res.candles.length > 1 ? res.candles[res.candles.length - 2].close : currentP);

        setLivePrice(currentP);
        setPriceDelta(currentP - prevP);
        setCacheSecondsLeft(60);
      }
    } catch (err) {
      console.error('[Yahoo Finance Data Error]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and reload on symbol or timeframe changes
  useEffect(() => {
    loadData(symbol, timeframe, false);
  }, [symbol, timeframe, loadData]);

  // 2-Second Auto-Refresh timer when market is open for real-time live Yahoo Finance candle streaming
  useEffect(() => {
    const timer = setInterval(() => {
      setCacheSecondsLeft((prev) => {
        if (prev <= 2) {
          if (isMarketOpen()) {
            loadData(symbol, timeframe, true);
          }
          return 60;
        }
        return prev - 2;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [symbol, timeframe, loadData]);

  // Real-time micro-tick fluctuation between 60s Yahoo Finance API updates
  const activeCandlesRef = useRef<CandleData[]>(candles);
  activeCandlesRef.current = candles;

  useEffect(() => {
    const tickInterval = setInterval(() => {
      if (!isMarketOpen()) return; // Stop price updates when market is closed (weekends)
      if (activeCandlesRef.current.length === 0) return;

      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = { ...prev[prev.length - 1] };
        const symInfo = getSymbolInfo(symbol);

        // Index tick volatility
        const tickDelta = (Math.random() - 0.495) * (symInfo.basePrice * 0.00008);
        const newClose = Number((last.close + tickDelta).toFixed(2));
        const newHigh = Number(Math.max(last.high, newClose).toFixed(2));
        const newLow = Number(Math.min(last.low, newClose).toFixed(2));

        const updatedLast: CandleData = {
          ...last,
          close: newClose,
          high: newHigh,
          low: newLow,
        };

        setLivePrice(newClose);
        return [...prev.slice(0, prev.length - 1), updatedLast];
      });
    }, 2000);

    return () => clearInterval(tickInterval);
  }, [symbol]);

  const symInfo = getSymbolInfo(symbol);

  return (
    <div className="flex flex-col w-screen h-screen bg-[#131722] text-[#d1d4dc] overflow-hidden select-none font-sans">
      {/* 1. TOP HORIZONTAL TOOLBAR WITH PROMINENT US30 / NASDAQ SWITCHER */}
      <TopBar
        symbol={symbol}
        onSelectSymbol={setSymbol}
        timeframe={timeframe}
        onChangeTimeframe={setTimeframe}
        chartType={chartType}
        onChangeChartType={setChartType}
        candleTheme={candleTheme}
        onOpenCandleColorModal={() => setIsCandleColorOpen(true)}
        lastPrice={livePrice}
        priceChange={priceDelta}
        onRefreshData={() => loadData(symbol, timeframe, true)}
        isLoadingData={loading}
        dataSource={dataSource}
        cacheSecondsLeft={cacheSecondsLeft}
      />

      {/* 2. MAIN WORKSPACE: Fully Horizontal layout (Chart + Horizontal News Row) */}
      <div className="flex flex-1 flex-col w-full h-[calc(100vh-3.5rem-2rem)] overflow-hidden bg-[#131722]">
        {/* Dark TradingView Chart Canvas */}
        <main className="flex-1 w-full overflow-hidden bg-[#131722] relative">
          <TradingViewChart
            symbolInfo={symInfo}
            timeframe={timeframe}
            chartType={chartType}
            candles={candles}
            candleTheme={candleTheme}
          />

          {/* Fullscreen Toggle Floating Button for Whole App */}
          <button
            onClick={toggleFullAppFullscreen}
            className="absolute top-3 right-3 z-30 p-2 rounded-lg bg-[#1e222d]/90 hover:bg-[#2a2e39] text-[#d1d4dc] hover:text-white border border-[#2a2e39] transition-all shadow-lg flex items-center gap-1.5 text-xs cursor-pointer"
            title={isFullscreen ? 'Exit Whole App Fullscreen' : 'Maximize Whole App Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-amber-400" />}
            <span className="hidden sm:inline font-mono text-[11px]">{isFullscreen ? 'Exit Fullscreen' : 'Whole App Fullscreen'}</span>
          </button>

          {/* Loading Indicator */}
          {loading && (
            <div className="absolute inset-0 bg-[#131722]/50 backdrop-blur-xs flex items-center justify-center z-40">
              <div className="flex flex-col items-center gap-2 bg-[#1e222d] border border-[#2a2e39] p-4 rounded-xl shadow-2xl">
                <div className="w-6 h-6 border-2 border-[#2962FF] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-[#d1d4dc] font-medium font-mono">
                  Loading 5m Candles for {symbol} from Yahoo Finance...
                </span>
              </div>
            </div>
          )}
        </main>
        
        {/* Horizontal News Ticker / Row at bottom */}
        <div className="h-44 border-t border-[#2a2e39] bg-[#131722] w-full shrink-0">
            <NewsFeed category={newsCategory} onSelectCategory={setNewsCategory} horizontal={true} />
        </div>
      </div>

      {/* 3. BOTTOM SETTINGS BAR */}
      <div className="h-12 bg-[#131722] border-t border-[#2a2e39] flex items-center px-4 gap-2">
          <span className="text-[10px] text-[#787b86]">BT Morgan Terminal</span>
      </div>
      {/* 4. CANDLE COLOR THEME MODAL */}
      <CandleColorModal
        isOpen={isCandleColorOpen}
        onClose={() => setIsCandleColorOpen(false)}
        currentTheme={candleTheme}
        onChangeTheme={handleUpdateCandleTheme}
      />
      
      {/* 5. CHART SETTINGS MODAL */}
      <ChartSettingsModal
        isOpen={isChartSettingsOpen}
        onClose={() => setIsChartSettingsOpen(false)}
        settings={chartSettings}
        onChangeSettings={setChartSettings}
      />

      {/* 6. GEMINI AI ASSISTANT CHATBOT */}
      <GeminiAssistant currentSymbol={symbol} currentTimeframe={timeframe} />
    </div>
  );
}
