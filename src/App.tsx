import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { StockDetailPanel, LeftPanelTab } from './components/StockDetailPanel';
import { TradingViewChart } from './components/TradingViewChart';
import { SymbolSearchModal } from './components/SymbolSearchModal';
import { AuthProvider } from './components/AuthProvider';

import { Timeframe, ChartType, CandleColorTheme, CandleData } from './types/chart';
import { getSymbolInfo, fetchMarketData } from './services/marketData';
import { DEFAULT_CANDLE_THEMES } from './utils/candleColors';
import { Language } from './utils/thaiTranslation';
import { useSymbolChangeDetector } from './utils/symbolChangeDetector';

function TerminalApp() {
  const [symbol, setSymbol] = useState<string>('DJI');
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [chartType, setChartType] = useState<ChartType>('Candlestick');
  const [candleTheme] = useState<CandleColorTheme>(DEFAULT_CANDLE_THEMES[0]);
  const [language] = useState<Language>('EN');

  // Panel collapse states
  const [isStockDetailCollapsed, setIsStockDetailCollapsed] = useState<boolean>(false);
  const [leftTab, setLeftTab] = useState<LeftPanelTab>('overview');

  // Modals
  const [isSymbolSearchOpen, setIsSymbolSearchOpen] = useState<boolean>(false);

  // Candles data state
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [, setIsLoading] = useState<boolean>(false);

  const symbolInfo = useMemo(() => getSymbolInfo(symbol), [symbol]);

  const generateFallbackCandles = useCallback(() => {
    const generated: CandleData[] = [];
    let baseP = symbolInfo.basePrice;
    const now = Math.floor(Date.now() / 300000) * 300000;
    for (let i = 60; i > 0; i--) {
      const time = now - i * 300000;
      const open = baseP + (Math.random() * 10 - 5);
      const close = open + (Math.random() * 14 - 7);
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;
      const volume = Math.round(Math.random() * 500 + 100);
      generated.push({ time, open, high, low, close, volume });
      baseP = close;
    }
    setCandles(generated);
  }, [symbolInfo.basePrice]);

  // Fetch market data using fetchMarketData from marketData.ts
  const fetchData = useCallback(async (force = false) => {
    setIsLoading(true);
    try {
      const [baseSymbol, session] = symbol.split('-');
      const result = await fetchMarketData(baseSymbol, timeframe, force, session as 'ETH' | 'RTH' | undefined);
      if (result && result.candles && result.candles.length > 0) {
        setCandles(result.candles);
      } else {
        generateFallbackCandles();
      }
    } catch {
      generateFallbackCandles();
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe, generateFallbackCandles]);

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const lastCandle = candles[candles.length - 1];
  const lastPrice = lastCandle ? lastCandle.close : symbolInfo.basePrice;
  const prevCandle = candles[candles.length - 2];
  const prevClose = prevCandle ? prevCandle.close : symbolInfo.basePrice;
  const priceChange = lastPrice - prevClose;

  const chartRef = useRef<{ resetToLive: () => void }>(null);

  useSymbolChangeDetector(symbol, useCallback(() => {
    if (chartRef.current) {
      chartRef.current.resetToLive();
    }
  }, []));

  return (
    <div className="flex flex-col h-screen w-screen bg-[#000000] text-[#d1d4dc] font-mono overflow-hidden select-none">
      
      {/* Top Navigation Bar */}
      <TopBar
        symbol={symbol}
        onSelectSymbol={(sym) => setSymbol(sym)}
        onOpenSymbolSearch={() => setIsSymbolSearchOpen(true)}
        timeframe={timeframe}
        onChangeTimeframe={(tf) => setTimeframe(tf)}
        chartType={chartType}
        onChangeChartType={(ct) => setChartType(ct)}
        language={language}
        onToggleStockDetail={() => setIsStockDetailCollapsed(!isStockDetailCollapsed)}
        isStockDetailOpen={!isStockDetailCollapsed}
      />

      {/* Main Workstation Body */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Stock Detail / Overview / News / Calendar Panel */}
        <StockDetailPanel
          symbol={symbol}
          lastPrice={lastPrice}
          priceChange={priceChange}
          candles={candles}
          isCollapsed={isStockDetailCollapsed}
          onToggleCollapse={() => setIsStockDetailCollapsed(!isStockDetailCollapsed)}
          onSelectSymbol={(sym) => setSymbol(sym)}
          activeTab={leftTab}
          onTabChange={(tab) => setLeftTab(tab)}
        />

        {/* Main Chart Canvas Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#000000]">
          <TradingViewChart
            ref={chartRef}
            symbolInfo={symbolInfo}
            timeframe={timeframe}
            chartType={chartType}
            candles={candles}
            candleTheme={candleTheme}
          />
        </div>
      </div>

      {/* Symbol Search Modal */}
      <SymbolSearchModal
        isOpen={isSymbolSearchOpen}
        onClose={() => setIsSymbolSearchOpen(false)}
        onSelectSymbol={(sym) => setSymbol(sym)}
        currentSymbol={symbol}
      />


    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <TerminalApp />
    </AuthProvider>
  );
}

export default App;
