import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  Time,
} from 'lightweight-charts';
import { Eye, EyeOff, Sliders, X, Tag, BarChart2, Target } from 'lucide-react';
import {
  CandleColorTheme,
  CandleData,
  ChartType,
  SymbolInfo,
  Timeframe,
} from '../types/chart';
import { IndicatorInstance } from '../types/indicators';
import { calculateHeikinAshi } from '../services/marketData';
import { formatPktDateTime } from '../utils/time';
import { IndicatorOverlay } from './indicators/IndicatorOverlay';
import { executePineScript } from '../services/pineScriptInterpreter';

interface RealtimeCandleChartProps {
  symbolInfo: SymbolInfo;
  timeframe: Timeframe;
  chartType: ChartType;
  candles: CandleData[];
  candleTheme: CandleColorTheme;
  activeIndicators: IndicatorInstance[];
  onToggleIndicatorVisibility?: (instanceId: string) => void;
  onToggleIndicatorLabels?: (instanceId: string) => void;
  onRemoveIndicator?: (instanceId: string) => void;
  onOpenIndicatorSettings?: (instance: IndicatorInstance) => void;
}

export const TradingViewChart: React.FC<RealtimeCandleChartProps> = ({
  symbolInfo,
  timeframe,
  chartType,
  candles,
  candleTheme,
  activeIndicators,
  onToggleIndicatorVisibility,
  onToggleIndicatorLabels,
  onRemoveIndicator,
  onOpenIndicatorSettings,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Dedicated series refs - created once and persisted throughout chart lifecycle
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const barSeriesRef = useRef<ISeriesApi<'Bar'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Dynamic series for custom Pine Script indicator plots
  const customSeriesMapRef = useRef<Map<string, ISeriesApi<'Line'>[]>>(new Map());

  // Active chart type tracking for crosshair legend
  const activeSeriesTypeRef = useRef<ChartType>(chartType);
  activeSeriesTypeRef.current = chartType;

  // Real-time OHLCV Legend
  const [legendData, setLegendData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
    changePercent: number;
    timeStr: string;
  } | null>(null);

  const candlesRef = useRef<CandleData[]>(candles);
  candlesRef.current = candles;

  const lastSymbolRef = useRef<string>(symbolInfo.symbol);
  const lastTimeframeRef = useRef<string>(timeframe);
  const initialFitDoneRef = useRef(false);

  // Initialize Chart and Core Series (Candles, Bar, Line, Area)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#787b86',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#2962FF',
          width: 1,
          style: 3,
          labelBackgroundColor: '#2962FF',
        },
        horzLine: {
          color: '#2962FF',
          width: 1,
          style: 3,
          labelBackgroundColor: '#2962FF',
        },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 9,
        minBarSpacing: 2,
      },
      localization: {
        timeFormatter: (time: number) => {
          return formatPktDateTime(time);
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // 1. Candlestick Series (Default & Heikin-Ashi)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: candleTheme.upColor,
      downColor: candleTheme.downColor,
      borderVisible: false,
      wickUpColor: candleTheme.wickUpColor || candleTheme.upColor,
      wickDownColor: candleTheme.wickDownColor || candleTheme.downColor,
    });
    candlestickSeriesRef.current = candleSeries;

    // 2. Bar Series (OHLC)
    const bSeries = chart.addSeries(BarSeries, {
      upColor: candleTheme.upColor,
      downColor: candleTheme.downColor,
      visible: false,
    });
    barSeriesRef.current = bSeries;

    // 3. Line Series
    const lSeries = chart.addSeries(LineSeries, {
      color: candleTheme.upColor,
      lineWidth: 2,
      visible: false,
    });
    lineSeriesRef.current = lSeries;

    // 4. Area Series (Mountain)
    const aSeries = chart.addSeries(AreaSeries, {
      topColor: `${candleTheme.upColor}40`,
      bottomColor: `${candleTheme.upColor}03`,
      lineColor: candleTheme.upColor,
      lineWidth: 2,
      visible: false,
    });
    areaSeriesRef.current = aSeries;

    // 5. Volume Histogram Series (Bottom Bar Histogram like TradingView)
    const vSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8, // volume bars occupy the bottom 20% of chart
        bottom: 0,
      },
    });
    volumeSeriesRef.current = vSeries;

    // Crosshair Inspection Listener
    chart.subscribeCrosshairMove((param) => {
      try {
        if (
          !param ||
          !param.time ||
          !param.point ||
          param.point.x < 0 ||
          param.point.x > chartContainerRef.current!.clientWidth ||
          param.point.y < 0 ||
          param.point.y > chartContainerRef.current!.clientHeight
        ) {
          const c = candlesRef.current;
          if (c && c.length > 0) {
            const last = c[c.length - 1];
            const prev = c.length > 1 ? c[c.length - 2].close : last.open;
            const diff = last.close - prev;
            const pct = prev > 0 ? (diff / prev) * 100 : 0;
            setLegendData({
              open: last.open,
              high: last.high,
              low: last.low,
              close: last.close,
              volume: last.volume ?? 0,
              change: diff,
              changePercent: pct,
              timeStr: formatPktDateTime(last.time),
            });
          }
          return;
        }

        const tNum = typeof param.time === 'number' ? param.time : Number(param.time);
        const timeStr = formatPktDateTime(tNum);

        const currentCandle = candlesRef.current.find((bar) => bar.time === tNum);
        if (currentCandle) {
          const prev = currentCandle.open;
          const diff = currentCandle.close - prev;
          const pct = prev > 0 ? (diff / prev) * 100 : 0;

          setLegendData({
            open: currentCandle.open,
            high: currentCandle.high,
            low: currentCandle.low,
            close: currentCandle.close,
            volume: currentCandle.volume ?? 0,
            change: diff,
            changePercent: pct,
            timeStr,
          });
        } else {
          let c = 0;
          if (activeSeriesTypeRef.current === 'Line' && lineSeriesRef.current) {
            const v = param.seriesData.get(lineSeriesRef.current) as any;
            if (v && v.value !== undefined) c = v.value;
          } else if (activeSeriesTypeRef.current === 'Area' && areaSeriesRef.current) {
            const v = param.seriesData.get(areaSeriesRef.current) as any;
            if (v && v.value !== undefined) c = v.value;
          }

          const diff = 0;
          const pct = 0;
          setLegendData({
            open: c,
            high: c,
            low: c,
            close: c,
            volume: 0,
            change: diff,
            changePercent: pct,
            timeStr,
          });
        }
      } catch {
        // Guard against transient frame unmounts
      }
    });

    // Resize Observer for fluid responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chart.applyOptions({ width, height });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      // Clean up any custom script series
      customSeriesMapRef.current.forEach((seriesList) => {
        seriesList.forEach((s) => {
          try {
            chart.removeSeries(s);
          } catch {}
        });
      });
      customSeriesMapRef.current.clear();

      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      barSeriesRef.current = null;
      lineSeriesRef.current = null;
      areaSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Update Candle Colors dynamically when theme changes
  useEffect(() => {
    candlestickSeriesRef.current?.applyOptions({
      upColor: candleTheme.upColor,
      downColor: candleTheme.downColor,
      wickUpColor: candleTheme.wickUpColor || candleTheme.upColor,
      wickDownColor: candleTheme.wickDownColor || candleTheme.downColor,
    });
    barSeriesRef.current?.applyOptions({
      upColor: candleTheme.upColor,
      downColor: candleTheme.downColor,
    });
    lineSeriesRef.current?.applyOptions({
      color: candleTheme.upColor,
    });
    areaSeriesRef.current?.applyOptions({
      topColor: `${candleTheme.upColor}40`,
      bottomColor: `${candleTheme.upColor}03`,
      lineColor: candleTheme.upColor,
    });
  }, [candleTheme]);

  // Update Price Formats whenever Symbol changes
  useEffect(() => {
    const priceFormat = {
      type: 'price' as const,
      precision: symbolInfo.precision,
      minMove: symbolInfo.pipSize,
    };
    candlestickSeriesRef.current?.applyOptions({ priceFormat });
    barSeriesRef.current?.applyOptions({ priceFormat });
    lineSeriesRef.current?.applyOptions({ priceFormat });
    areaSeriesRef.current?.applyOptions({ priceFormat });

    chartRef.current?.timeScale().fitContent();
  }, [symbolInfo]);

  // Update Series Visibility when ChartType changes
  useEffect(() => {
    candlestickSeriesRef.current?.applyOptions({
      visible: chartType === 'Candlestick' || chartType === 'Heikin-Ashi',
    });
    barSeriesRef.current?.applyOptions({
      visible: chartType === 'Bar',
    });
    lineSeriesRef.current?.applyOptions({
      visible: chartType === 'Line',
    });
    areaSeriesRef.current?.applyOptions({
      visible: chartType === 'Area',
    });
  }, [chartType]);

  // Jump to live helper function (teleports to live candle and views the whole day chart)
  const handleJumpToLive = () => {
    if (chartRef.current && candles && candles.length > 0) {
      chartRef.current.timeScale().scrollToRealTime();
      const totalBars = candles.length;
      const lastCandle = candles[totalBars - 1];
      
      let startIndex = 0;
      if (lastCandle && lastCandle.time) {
        const lastDate = new Date(Number(lastCandle.time) * 1000).toDateString();
        for (let i = totalBars - 1; i >= 0; i--) {
          const d = new Date(Number(candles[i].time) * 1000).toDateString();
          if (d !== lastDate) {
            startIndex = i + 1;
            break;
          }
        }
      }

      const fromIndex = Math.max(0, startIndex);
      const toIndex = totalBars + 4;
      chartRef.current.timeScale().setVisibleLogicalRange({ from: fromIndex, to: toIndex });
    }
  };

  // Listen to global jump-to-live event from collapsed sidebar
  useEffect(() => {
    const listener = () => handleJumpToLive();
    window.addEventListener('jump-to-live', listener);
    return () => {
      window.removeEventListener('jump-to-live', listener);
    };
  }, [candles]);

  // Feed Data to Core Series
  useEffect(() => {
    if (!candles || candles.length === 0) return;

    const validCandles = candles
      .filter(
        (c) =>
          Number.isFinite(c.time) &&
          c.time > 0 &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close)
      )
      .sort((a, b) => a.time - b.time);

    if (validCandles.length === 0) return;

    const sanitized: CandleData[] = [];
    let prevTime = -Infinity;
    for (const c of validCandles) {
      if (c.time > prevTime) {
        sanitized.push(c);
        prevTime = c.time;
      }
    }

    if (sanitized.length === 0) return;

    let displayCandles = sanitized;
    if (chartType === 'Heikin-Ashi') {
      displayCandles = calculateHeikinAshi(sanitized);
    }

    const ohlcData = displayCandles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const singleValData = sanitized.map((c) => ({
      time: c.time as Time,
      value: c.close,
    }));

    if (chartType === 'Candlestick' || chartType === 'Heikin-Ashi') {
      candlestickSeriesRef.current?.setData(ohlcData);
    } else if (chartType === 'Bar') {
      barSeriesRef.current?.setData(ohlcData);
    } else if (chartType === 'Line') {
      lineSeriesRef.current?.setData(singleValData);
    } else if (chartType === 'Area') {
      areaSeriesRef.current?.setData(singleValData);
    }

    // Feed volume histogram data per candle from Yahoo Finance
    const volumeData = sanitized.map((c) => {
      const isUp = c.close >= c.open;
      const upColor = candleTheme.upColor ? `${candleTheme.upColor}80` : 'rgba(0, 200, 83, 0.55)';
      const downColor = candleTheme.downColor ? `${candleTheme.downColor}80` : 'rgba(255, 23, 68, 0.55)';
      return {
        time: c.time as Time,
        value: c.volume ?? 0,
        color: isUp ? upColor : downColor,
      };
    });
    volumeSeriesRef.current?.setData(volumeData);

    // Update legend
    const last = sanitized[sanitized.length - 1];
    const prev = sanitized.length > 1 ? sanitized[sanitized.length - 2].close : last.open;
    const diff = last.close - prev;
    const pct = prev > 0 ? (diff / prev) * 100 : 0;
    setLegendData({
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: last.volume ?? 0,
      change: diff,
      changePercent: pct,
      timeStr: formatPktDateTime(last.time),
    });

    // Ensure chart lands directly at exact live/current price candle
    const symbolChanged = lastSymbolRef.current !== symbolInfo.symbol;
    const timeframeChanged = lastTimeframeRef.current !== timeframe;
    const isFirstLoad = !initialFitDoneRef.current;

    if (chartRef.current && (symbolChanged || timeframeChanged || isFirstLoad)) {
      lastSymbolRef.current = symbolInfo.symbol;
      lastTimeframeRef.current = timeframe;
      initialFitDoneRef.current = true;

      // Scroll to realtime and set optimal focus on the latest live bars
      const totalBars = sanitized.length;
      if (totalBars > 0) {
        chartRef.current.timeScale().scrollToRealTime();
        const fromIndex = Math.max(0, totalBars - 65);
        const toIndex = totalBars + 6;
        chartRef.current.timeScale().setVisibleLogicalRange({ from: fromIndex, to: toIndex });
      }
    }
  }, [candles, chartType, candleTheme, symbolInfo.symbol, timeframe]);

  // Synchronize Custom Script Indicators as Live Line Series on Chart
  useEffect(() => {
    if (!chartRef.current || !candles || candles.length === 0) return;

    const chart = chartRef.current;
    const currentActiveIds = new Set(activeIndicators.map((i) => i.instanceId));

    // 1. Remove series for indicators that were deleted
    customSeriesMapRef.current.forEach((seriesList, id) => {
      if (!currentActiveIds.has(id)) {
        seriesList.forEach((s) => {
          try {
            chart.removeSeries(s);
          } catch {}
        });
        customSeriesMapRef.current.delete(id);
      }
    });

    // 2. Add or update series for active custom scripts
    activeIndicators.forEach((inst) => {
      const isCustom = inst.category === 'CUSTOM' || inst.definitionId === 'custom_pine' || !!inst.scriptCode;
      if (!isCustom) return;

      const code = inst.scriptCode || inst.inputs?.scriptCode || '';
      if (!code) return;

      const res = executePineScript(code, candles);
      const isVisible = inst.visible && inst.enabled;

      let seriesList = customSeriesMapRef.current.get(inst.instanceId);
      if (!seriesList || seriesList.length !== res.plots.length) {
        // Remove existing if count mismatch
        if (seriesList) {
          seriesList.forEach((s) => {
            try {
              chart.removeSeries(s);
            } catch {}
          });
        }

        // Create new line series
        seriesList = res.plots.map((p) => {
          return chart.addSeries(LineSeries, {
            color: p.color || inst.style?.color || '#2962FF',
            lineWidth: 2,
            title: p.label || inst.name,
            priceLineVisible: false,
            lastValueVisible: true,
            visible: isVisible,
          });
        });
        customSeriesMapRef.current.set(inst.instanceId, seriesList);
      }

      // Update data and visibility
      res.plots.forEach((p, idx) => {
        const s = seriesList![idx];
        if (s) {
          s.applyOptions({
            color: p.color || inst.style?.color || '#2962FF',
            visible: isVisible,
          });
          const plotData = p.data.map((d) => ({
            time: d.time as Time,
            value: d.value,
          }));
          s.setData(plotData);
        }
      });
    });
  }, [candles, activeIndicators]);

  const formatVolume = (v: number) => {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
    if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
    return v.toString();
  };

  return (
    <div className="relative w-full h-full bg-[#131722] overflow-hidden select-none">
      {/* Watermark & Live OHLCV Status Bar */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2.5 text-xs pointer-events-none">
        <div className="flex items-center gap-2 text-[13px] font-serif italic bg-[#131722]/90 backdrop-blur-xs px-3.5 py-1.5 rounded-md border border-[#D4AF37]/30 shadow-md">
          <span className="font-bold text-[#D4AF37] tracking-widest uppercase">BT MORGAN</span>
          <span className="text-[#B22222] font-semibold text-[11px] not-italic tracking-normal">The Hidden Power®</span>
        </div>

        {legendData && (
          <div className="flex items-center gap-2 bg-[#131722]/90 backdrop-blur-xs px-3 py-1.5 rounded-md border border-[#2a2e39] text-[11px] font-mono shadow-md overflow-hidden">
            <span className="font-bold text-white uppercase">{symbolInfo.symbol}</span>
            <span className="text-[#787b86]">{timeframe}</span>
            <span className="text-[#787b86]">O</span>
            <span className="text-white font-semibold">{legendData.open.toFixed(symbolInfo.precision)}</span>
            <span className="text-[#787b86]">H</span>
            <span className="text-white font-semibold">{legendData.high.toFixed(symbolInfo.precision)}</span>
            <span className="text-[#787b86]">L</span>
            <span className="text-white font-semibold">{legendData.low.toFixed(symbolInfo.precision)}</span>
            <span className="text-[#787b86]">C</span>
            <span className="text-white font-semibold">{legendData.close.toFixed(symbolInfo.precision)}</span>
            <span className={`font-semibold ${legendData.change >= 0 ? 'text-[#00C853]' : 'text-[#FF1744]'}`}>
              {legendData.change >= 0 ? '+' : ''}{legendData.change.toFixed(symbolInfo.precision)} ({legendData.change >= 0 ? '+' : ''}{legendData.changePercent.toFixed(2)}%)
            </span>
            <span className="text-[#787b86] border-l border-[#2a2e39] pl-2">Vol</span>
            <span className="text-cyan-400 font-bold">{formatVolume(legendData.volume)}</span>
          </div>
        )}
      </div>

      {/* Bottom Volume Indicator Badge */}
      <div className="absolute bottom-6 left-3 z-20 flex items-center gap-1.5 bg-[#131722]/85 backdrop-blur-xs px-2.5 py-1 rounded border border-[#2a2e39] text-[10px] font-mono text-[#787b86] pointer-events-none">
        <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-white font-bold">Vol (Yahoo Finance):</span>
        <span className="text-cyan-400 font-bold">
          {legendData ? formatVolume(legendData.volume) : '--'}
        </span>
      </div>



      {/* On-Chart Active Indicators Legend */}
      {activeIndicators.length > 0 && (
        <div className="absolute top-16 left-3 z-20 flex flex-col gap-1 pointer-events-auto bg-[#131722]/90 backdrop-blur-xs p-2 rounded-lg border border-[#2a2e39] shadow-xl max-w-xs transition-all">
          <div className="text-[10px] font-bold text-[#787b86] uppercase tracking-wider px-1 pb-1 border-b border-[#2a2e39] flex items-center justify-between">
            <span>Active Indicators ({activeIndicators.length})</span>
          </div>

          <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-0.5 mt-1">
            {activeIndicators.map((inst) => {
              const isVisible = inst.visible && inst.enabled;
              const isCustom = inst.category === 'CUSTOM' || inst.definitionId === 'custom_pine';

              return (
                <div
                  key={inst.instanceId}
                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded transition-colors text-xs ${
                    isVisible ? 'bg-[#1e222d] text-[#d1d4dc]' : 'bg-[#1e222d]/40 text-[#787b86]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isVisible
                          ? isCustom
                            ? 'bg-purple-400 shadow-xs shadow-purple-400/50'
                            : 'bg-[#2962FF] shadow-xs shadow-[#2962FF]/50'
                          : 'bg-zinc-600'
                      }`}
                    />
                    <span
                      className={`truncate text-[11px] font-medium ${
                        !isVisible ? 'line-through text-[#787b86]' : 'text-[#d1d4dc]'
                      }`}
                      title={inst.name}
                    >
                      {inst.name}
                    </span>
                    {inst.definitionId === 'order_blocks' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#2962FF]/20 text-[#2962FF] font-mono shrink-0">
                        {[
                          inst.inputs.filterBreakStructure ? 'BOS' : null,
                          inst.inputs.filterFormFVG ? 'FVG' : null,
                          inst.inputs.filterAfterSweep ? 'SWEEP' : null,
                          inst.inputs.filterSessionOnly ? 'SESSION' : null,
                        ].filter(Boolean).length > 0
                          ? [
                              inst.inputs.filterBreakStructure ? 'BOS' : null,
                              inst.inputs.filterFormFVG ? 'FVG' : null,
                              inst.inputs.filterAfterSweep ? 'SWEEP' : null,
                              inst.inputs.filterSessionOnly ? 'SESSION' : null,
                            ].filter(Boolean).join('+')
                          : 'ALL'}
                      </span>
                    )}
                    {inst.definitionId === 'liquidity_zones' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FF9100]/20 text-[#FF9100] font-mono shrink-0">
                        {[
                          (inst.inputs.showDayHighLow ?? true) ? 'DAY' : null,
                          (inst.inputs.showSessionHighLow ?? true) ? 'SESS' : null,
                          (inst.inputs.showThreeTouchEqualHL ?? true) ? '3xEQ' : null,
                          (inst.inputs.showTrendlineLiquidity ?? true) ? '3xTL' : null,
                        ].filter(Boolean).length > 0
                          ? [
                              (inst.inputs.showDayHighLow ?? true) ? 'DAY' : null,
                              (inst.inputs.showSessionHighLow ?? true) ? 'SESS' : null,
                              (inst.inputs.showThreeTouchEqualHL ?? true) ? '3xEQ' : null,
                              (inst.inputs.showTrendlineLiquidity ?? true) ? '3xTL' : null,
                            ].filter(Boolean).join('+')
                          : 'OFF'}
                      </span>
                    )}

                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                        (inst.inputs.showLabels ?? true)
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-zinc-800 text-zinc-500 line-through'
                      }`}
                      title={(inst.inputs.showLabels ?? true) ? 'Labels are ON (Visible)' : 'Labels are OFF (Hidden)'}
                    >
                      {(inst.inputs.showLabels ?? true) ? 'LABEL: ON' : 'LABEL: OFF'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onToggleIndicatorVisibility?.(inst.instanceId)}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        isVisible
                          ? 'text-emerald-400 hover:bg-[#2a2e39]'
                          : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
                      }`}
                      title={isVisible ? 'Hide Indicator (Turn OFF)' : 'Show Indicator (Turn ON)'}
                    >
                      {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    {onToggleIndicatorLabels && (
                      <button
                        onClick={() => onToggleIndicatorLabels(inst.instanceId)}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          (inst.inputs.showLabels ?? true)
                            ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
                            : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
                        }`}
                        title={(inst.inputs.showLabels ?? true) ? 'Labels: ON (Click to turn OFF)' : 'Labels: OFF (Click to turn ON)'}
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onOpenIndicatorSettings?.(inst)}
                      className="p-1 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-colors cursor-pointer"
                      title="Settings"
                    >
                      <Sliders className="w-3 h-3 text-[#2962FF]" />
                    </button>
                    <button
                      onClick={() => onRemoveIndicator?.(inst.instanceId)}
                      className="p-1 rounded hover:bg-rose-900/40 text-[#787b86] hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Jump to Live Price Button */}
          <button
            onClick={handleJumpToLive}
            className="mt-2 w-full flex items-center justify-center gap-1.5 bg-[#1e222d] hover:bg-[#2962FF] text-[#d1d4dc] hover:text-white px-3 py-1.5 rounded-md border border-[#2a2e39] hover:border-[#2962FF] text-xs font-mono font-bold shadow-md transition-all cursor-pointer group pointer-events-auto"
            title="Jump screen to live price of selected symbol"
          >
            <Target className="w-3.5 h-3.5 text-[#2962FF] group-hover:text-white animate-pulse" />
            <span>Jump to Live Price</span>
          </button>
        </div>
      )}

      {/* Chart Canvas */}
      <div 
        ref={chartContainerRef} 
        className="w-full h-full" 
      />

      {/* Indicator Overlay (FVG, Sessions, Order Blocks, Liquidity) */}
      <IndicatorOverlay
        chart={chartRef.current}
        series={candlestickSeriesRef.current}
        candles={candles}
        activeIndicators={activeIndicators}
      />
    </div>
  );
};
