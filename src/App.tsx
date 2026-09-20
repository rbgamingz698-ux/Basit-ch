import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { TradingViewChart } from './components/TradingViewChart';
import { BottomBar } from './components/BottomBar';
import { StockDetailPanel, LeftPanelTab } from './components/StockDetailPanel';
import { SymbolSearchModal } from './components/SymbolSearchModal';
import { CandleColorModal } from './components/CandleColorModal';
import { ChartSettingsModal } from './components/ChartSettingsModal';
import { IndicatorLibraryModal } from './components/indicators/IndicatorLibraryModal';
import { IndicatorSettingsModal } from './components/indicators/IndicatorSettingsModal';
import { PineScriptEditorModal } from './components/indicators/PineScriptEditorModal';
import { NewsNotification } from './components/NewsNotification';
import { GeminiAssistant } from './components/GeminiAssistant';
import { 
  CandleColorTheme, 
  CandleData, 
  ChartType, 
  Timeframe, 
  SymbolInfo 
} from './types/chart';
import { 
  IndicatorInstance, 
  IndicatorDefinition, 
  SavedCustomScript 
} from './types/indicators';
import { 
  fetchCandles, 
  getSymbolInfo, 
  SUPPORTED_SYMBOLS 
} from './services/marketData';
import { DEFAULT_THEME } from './utils/candleColors';
import { PineScriptResult } from './services/pineScriptInterpreter';
import { Language } from './utils/thaiTranslation';

const INITIAL_INDICATORS: IndicatorInstance[] = [
  {
    instanceId: 'inst-sessions-1',
    definitionId: 'sessions',
    name: 'Trading Sessions',
    category: 'SMART_MONEY_CONCEPTS',
    enabled: true,
    visible: true,
    inputs: {
      utcOffset: 5,
      showLabels: false,
      sessionLabelName: true,
      sessionLabelHours: true,
      sessionLabelHighLow: true,
      labelHighlightBg: true,
    },
    style: {
      asiaColor: '#2962FF',
      londonColor: '#00C853',
      nyColor: '#FF1744',
    },
    visibility: {
      seconds: true,
      minutes: true,
      hours: true,
      days: true,
      weeks: true,
      months: true,
    },
  },
  {
    instanceId: 'inst-orb-1',
    definitionId: 'volumatic_orb',
    name: 'Volumatic ORB 15min',
    category: 'VOLUMATIC',
    enabled: false,
    visible: false,
    inputs: {
      startTime: '06:30',
      endTime: '06:45',
      utcOffset: 5,
      showBreakoutSignals: true,
      showLabels: false,
      orbLabelTitle: true,
      orbLabelPrice: true,
      labelHighlightBg: true,
    },
    style: {
      rangeColor: '#E040FB',
      bullishBreakColor: '#00FF68',
      bearishBreakColor: '#FF0008',
      opacity: 0.08,
    },
    visibility: {
      seconds: true,
      minutes: true,
      hours: true,
      days: true,
      weeks: true,
      months: true,
    },
  },
];

export function App() {
  // Core Chart State
  const [symbol, setSymbol] = useState<string>('US30');
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [chartType, setChartType] = useState<ChartType>('Candlestick');
  const [candleTheme, setCandleTheme] = useState<CandleColorTheme>(DEFAULT_THEME);
  const [language, setLanguage] = useState<Language>('EN');

  // Market Data State
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [lastPrice, setLastPrice] = useState<number>(51778.04);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<string>('Yahoo Finance');
  const [cacheSecondsLeft, setCacheSecondsLeft] = useState<number>(60);

  // Indicators State
  const [activeIndicators, setActiveIndicators] = useState<IndicatorInstance[]>(INITIAL_INDICATORS);
  const [savedCustomScripts, setSavedCustomScripts] = useState<SavedCustomScript[]>([]);
  const [activeSettingsInstance, setActiveSettingsInstance] = useState<IndicatorInstance | null>(null);

  // Left Panel State (Stock Overview, Stocks News, Economic Calendar)
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('overview');

  // Toggle Left Panel Tabs handlers
  const handleToggleStocksNews = () => {
    if (isLeftPanelCollapsed) {
      setIsLeftPanelCollapsed(false);
      setLeftPanelTab('news');
    } else if (leftPanelTab === 'news') {
      setIsLeftPanelCollapsed(true);
    } else {
      setLeftPanelTab('news');
    }
  };

  const handleToggleCalendar = () => {
    if (isLeftPanelCollapsed) {
      setIsLeftPanelCollapsed(false);
      setLeftPanelTab('calendar');
    } else if (leftPanelTab === 'calendar') {
      setIsLeftPanelCollapsed(true);
    } else {
      setLeftPanelTab('calendar');
    }
  };

  const handleToggleOverview = () => {
    if (isLeftPanelCollapsed) {
      setIsLeftPanelCollapsed(false);
      setLeftPanelTab('overview');
    } else if (leftPanelTab === 'overview') {
      setIsLeftPanelCollapsed(true);
    } else {
      setLeftPanelTab('overview');
    }
  };

  // Modals State
  const [isSymbolSearchOpen, setIsSymbolSearchOpen] = useState<boolean>(false);
  const [isCandleColorModalOpen, setIsCandleColorModalOpen] = useState<boolean>(false);
  const [isIndicatorLibraryOpen, setIsIndicatorLibraryOpen] = useState<boolean>(false);
  const [isChartSettingsOpen, setIsChartSettingsOpen] = useState<boolean>(false);
  const [isPineEditorOpen, setIsPineEditorOpen] = useState<boolean>(false);
  const [chartSettings, setChartSettings] = useState<any>({});

  // News Notification State
  const [notificationItem, setNotificationItem] = useState<{
    title: string;
    publisher?: string;
    link?: string;
    uuid?: string;
    pktDateTime?: string;
    impact?: string;
  } | null>(null);

  const symbolInfo: SymbolInfo = getSymbolInfo(symbol);

  // Fetch candle data for current symbol & timeframe
  const loadCandleData = useCallback(async (forceRefresh = false) => {
    setIsLoadingData(true);
    try {
      const result = await fetchCandles(symbol, timeframe, forceRefresh);
      if (result.candles && result.candles.length > 0) {
        setCandles(result.candles);
        const latestCandle = result.candles[result.candles.length - 1];
        const latestPrice = result.regularMarketPrice ?? latestCandle.close;
        setLastPrice(latestPrice);

        const prevClose = result.previousClose ?? result.candles[0].open;
        if (prevClose && prevClose > 0) {
          setPriceChange(latestPrice - prevClose);
        } else {
          setPriceChange(0);
        }

        setDataSource(result.source || 'Yahoo Finance');
        setCacheSecondsLeft(60);
      }
    } catch (err) {
      console.error('Failed to load candle data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [symbol, timeframe]);

  // Initial and reactive load
  useEffect(() => {
    loadCandleData();
  }, [loadCandleData]);

  // Countdown timer for data cache refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setCacheSecondsLeft((prev) => {
        if (prev <= 1) {
          loadCandleData();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loadCandleData]);

  // Indicator Handlers
  const handleAddIndicator = (def: IndicatorDefinition) => {
    const newInstance: IndicatorInstance = {
      instanceId: `inst-${def.id}-${Date.now()}`,
      definitionId: def.id,
      name: def.name,
      category: def.category,
      enabled: true,
      visible: true,
      inputs: { ...def.defaultInputs },
      style: { ...def.defaultStyle },
      visibility: { ...def.defaultVisibility },
      scriptCode: def.scriptCode,
    };
    setActiveIndicators((prev) => [...prev, newInstance]);
  };

  const handleRemoveIndicator = (instanceId: string) => {
    setActiveIndicators((prev) => prev.filter((i) => i.instanceId !== instanceId));
    if (activeSettingsInstance?.instanceId === instanceId) {
      setActiveSettingsInstance(null);
    }
  };

  const handleToggleIndicatorVisibility = (instanceId: string) => {
    setActiveIndicators((prev) =>
      prev.map((inst) =>
        inst.instanceId === instanceId
          ? { ...inst, visible: !inst.visible, enabled: !inst.visible }
          : inst
      )
    );
  };

  const handleToggleIndicatorLabels = (instanceId: string) => {
    setActiveIndicators((prev) =>
      prev.map((inst) => {
        if (inst.instanceId === instanceId) {
          const currentShow = inst.inputs.showLabels ?? false;
          return {
            ...inst,
            inputs: { ...inst.inputs, showLabels: !currentShow },
          };
        }
        return inst;
      })
    );
  };

  const handleOpenIndicatorSettings = (instance: IndicatorInstance) => {
    setActiveSettingsInstance(instance);
  };

  const handleSaveIndicatorSettings = (updated: IndicatorInstance) => {
    setActiveIndicators((prev) =>
      prev.map((inst) => (inst.instanceId === updated.instanceId ? updated : inst))
    );
    setActiveSettingsInstance(null);
  };

  // Custom Pine Script Handlers
  const handleSaveCustomScript = (script: SavedCustomScript) => {
    setSavedCustomScripts((prev) => {
      const idx = prev.findIndex((s) => s.id === script.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = script;
        return next;
      }
      return [...prev, script];
    });
  };

  const handleDeleteCustomScript = (scriptId: string) => {
    setSavedCustomScripts((prev) => prev.filter((s) => s.id !== scriptId));
  };

  const handleRunCustomScript = (script: { name: string; description: string; code: string }) => {
    const newInstance: IndicatorInstance = {
      instanceId: `inst-custom-${Date.now()}`,
      definitionId: `custom-${Date.now()}`,
      name: script.name || 'Custom Script',
      category: 'CUSTOM',
      enabled: true,
      visible: true,
      inputs: {},
      style: { plotColor: '#2962FF' },
      visibility: { seconds: true, minutes: true, hours: true, days: true, weeks: true, months: true },
      scriptCode: script.code,
    };
    setActiveIndicators((prev) => [...prev, newInstance]);
  };

  // Trigger manual news notification popup
  const handleTriggerNewsPopup = () => {
    setNotificationItem({
      title: 'US CPI Inflation Data Release Incoming',
      publisher: 'Bureau of Labor Statistics / ForexFactory',
      pktDateTime: 'PKT 18:30 (Today)',
      impact: 'High',
      link: 'https://www.forexfactory.com/',
      uuid: `news-toast-${Date.now()}`,
    });
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#131722] text-[#d1d4dc] font-sans antialiased select-none">
      {/* Top Application Bar */}
      <TopBar
        symbol={symbol}
        onSelectSymbol={(sym) => setSymbol(sym)}
        onOpenSymbolSearch={() => setIsSymbolSearchOpen(true)}
        timeframe={timeframe}
        onChangeTimeframe={(tf) => setTimeframe(tf)}
        chartType={chartType}
        onChangeChartType={(ct) => setChartType(ct)}
        candleTheme={candleTheme}
        onOpenCandleColorModal={() => setIsCandleColorModalOpen(true)}
        onOpenIndicatorLibrary={() => setIsIndicatorLibraryOpen(true)}
        lastPrice={lastPrice}
        priceChange={priceChange}
        onRefreshData={() => loadCandleData(true)}
        isLoadingData={isLoadingData}
        dataSource={dataSource}
        cacheSecondsLeft={cacheSecondsLeft}
        language={language}
        onChangeLanguage={(lang) => setLanguage(lang)}
        onTriggerNewsPopup={handleTriggerNewsPopup}
        onToggleStocksNews={handleToggleStocksNews}
        isStocksNewsOpen={!isLeftPanelCollapsed && leftPanelTab === 'news'}
        onToggleCalendar={handleToggleCalendar}
        isCalendarOpen={!isLeftPanelCollapsed && leftPanelTab === 'calendar'}
        onToggleStockDetail={handleToggleOverview}
        isStockDetailOpen={!isLeftPanelCollapsed && leftPanelTab === 'overview'}
      />

      {/* Main Content Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Unified Panel: Stock Overview, Stocks News, & Economic Calendar */}
        <StockDetailPanel
          symbol={symbol}
          lastPrice={lastPrice}
          priceChange={priceChange}
          candles={candles}
          isCollapsed={isLeftPanelCollapsed}
          onToggleCollapse={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
          onSelectSymbol={(sym) => setSymbol(sym)}
          onNewNews={(item) => setNotificationItem(item)}
          activeTab={leftPanelTab}
          onTabChange={(tab) => setLeftPanelTab(tab)}
        />

        {/* Center & Right: Full-Screen Interactive TradingView Chart (with unobstructed right price scale) */}
        <div className="flex-1 h-full relative overflow-hidden bg-[#131722]">
          <TradingViewChart
            symbolInfo={symbolInfo}
            timeframe={timeframe}
            chartType={chartType}
            candles={candles}
            candleTheme={candleTheme}
            activeIndicators={activeIndicators}
            onToggleIndicatorVisibility={handleToggleIndicatorVisibility}
            onToggleIndicatorLabels={handleToggleIndicatorLabels}
            onRemoveIndicator={handleRemoveIndicator}
            onOpenIndicatorSettings={handleOpenIndicatorSettings}
          />
        </div>
      </div>

      {/* Bottom Status & Ticker Bar */}
      <BottomBar
        currentSymbol={symbol}
        onSelectSymbol={(sym) => setSymbol(sym)}
        lastPrice={lastPrice}
      />

      {/* Modals & Dialogs */}
      <SymbolSearchModal
        isOpen={isSymbolSearchOpen}
        onClose={() => setIsSymbolSearchOpen(false)}
        currentSymbol={symbol}
        onSelectSymbol={(sym) => {
          setSymbol(sym);
          setIsSymbolSearchOpen(false);
        }}
      />

      <CandleColorModal
        isOpen={isCandleColorModalOpen}
        onClose={() => setIsCandleColorModalOpen(false)}
        currentTheme={candleTheme}
        onChangeTheme={(th) => setCandleTheme(th)}
      />

      <ChartSettingsModal
        isOpen={isChartSettingsOpen}
        onClose={() => setIsChartSettingsOpen(false)}
        settings={chartSettings}
        onChangeSettings={(s) => setChartSettings(s)}
      />

      <IndicatorLibraryModal
        isOpen={isIndicatorLibraryOpen}
        onClose={() => setIsIndicatorLibraryOpen(false)}
        activeIndicators={activeIndicators}
        onAddIndicator={handleAddIndicator}
        onRemoveIndicator={handleRemoveIndicator}
        onToggleIndicatorVisibility={handleToggleIndicatorVisibility}
        onOpenSettings={handleOpenIndicatorSettings}
        candles={candles}
        savedCustomScripts={savedCustomScripts}
        onSaveCustomScript={handleSaveCustomScript}
        onDeleteCustomScript={handleDeleteCustomScript}
        onRunCustomScript={handleRunCustomScript}
      />

      <IndicatorSettingsModal
        isOpen={activeSettingsInstance !== null}
        onClose={() => setActiveSettingsInstance(null)}
        instance={activeSettingsInstance}
        onSave={handleSaveIndicatorSettings}
      />

      <PineScriptEditorModal
        isOpen={isPineEditorOpen}
        onClose={() => setIsPineEditorOpen(false)}
        candles={candles}
        onApplyScriptResult={(res: PineScriptResult) => {
          if (res && res.title) {
            handleRunCustomScript({
              name: res.title,
              description: 'Custom Pine Script Execution',
              code: '',
            });
          }
        }}
        onSaveScript={handleSaveCustomScript}
      />

      {/* News Notification Toast */}
      {notificationItem && (
        <NewsNotification
          item={notificationItem}
          onClose={() => setNotificationItem(null)}
          durationSeconds={12}
        />
      )}

      {/* Gemini AI Assistant Chatbot */}
      <GeminiAssistant
        currentSymbol={symbol}
        currentTimeframe={timeframe}
      />
    </div>
  );
}

export default App;
