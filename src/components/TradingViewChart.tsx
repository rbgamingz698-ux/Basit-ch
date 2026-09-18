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
  Time,
} from 'lightweight-charts';
import {
  CandleColorTheme,
  CandleData,
  ChartType,
  SymbolInfo,
  Timeframe,
} from '../types/chart';
import { calculateHeikinAshi } from '../services/marketData';
import { formatPktDateTime } from '../utils/time';

interface RealtimeCandleChartProps {
  symbolInfo: SymbolInfo;
  timeframe: Timeframe;
  chartType: ChartType;
  candles: CandleData[];
  candleTheme: CandleColorTheme;
}

export const TradingViewChart: React.FC<RealtimeCandleChartProps> = ({
  symbolInfo,
  timeframe,
  chartType,
  candles,
  candleTheme,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Dedicated series refs - created once and persisted throughout chart lifecycle
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const barSeriesRef = useRef<ISeriesApi<'Bar'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  // Active chart type tracking for crosshair legend
  const activeSeriesTypeRef = useRef<ChartType>(chartType);
  activeSeriesTypeRef.current = chartType;

  // Real-time OHLC Legend
  const [legendData, setLegendData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
    timeStr: string;
  } | null>(null);

  const candlesRef = useRef<CandleData[]>(candles);
  candlesRef.current = candles;

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
        scaleMargins: {
          top: 0.08,
          bottom: 0.08,
        },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
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
      visible: chartType === 'Candlestick' || chartType === 'Heikin-Ashi',
      priceFormat: {
        type: 'price',
        precision: symbolInfo.precision,
        minMove: symbolInfo.pipSize,
      },
    });
    candlestickSeriesRef.current = candleSeries;

    // 2. Bar Series
    const barSeries = chart.addSeries(BarSeries, {
      upColor: candleTheme.upColor,
      downColor: candleTheme.downColor,
      visible: chartType === 'Bar',
      priceFormat: {
        type: 'price',
        precision: symbolInfo.precision,
        minMove: symbolInfo.pipSize,
      },
    });
    barSeriesRef.current = barSeries;

    // 3. Line Series
    const lineSeries = chart.addSeries(LineSeries, {
      color: candleTheme.upColor,
      lineWidth: 2,
      visible: chartType === 'Line',
      priceFormat: {
        type: 'price',
        precision: symbolInfo.precision,
        minMove: symbolInfo.pipSize,
      },
    });
    lineSeriesRef.current = lineSeries;

    // 4. Area Series
    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: `${candleTheme.upColor}40`,
      bottomColor: `${candleTheme.upColor}03`,
      lineColor: candleTheme.upColor,
      lineWidth: 2,
      visible: chartType === 'Area',
      priceFormat: {
        type: 'price',
        precision: symbolInfo.precision,
        minMove: symbolInfo.pipSize,
      },
    });
    areaSeriesRef.current = areaSeries;

    // Helper to get currently active series
    const getActiveSeries = () => {
      switch (activeSeriesTypeRef.current) {
        case 'Line':
          return lineSeriesRef.current;
        case 'Area':
          return areaSeriesRef.current;
        case 'Bar':
          return barSeriesRef.current;
        case 'Candlestick':
        case 'Heikin-Ashi':
        default:
          return candlestickSeriesRef.current;
      }
    };

    // Crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      try {
        const activeSeries = getActiveSeries();
        if (!activeSeries) return;

        if (!param || !param.time || !param.seriesData) {
          const latestList = candlesRef.current;
          if (latestList.length > 0) {
            const last = latestList[latestList.length - 1];
            const prev = latestList.length > 1 ? latestList[latestList.length - 2].close : last.open;
            const diff = last.close - prev;
            const pct = prev > 0 ? (diff / prev) * 100 : 0;
            setLegendData({
              open: last.open,
              high: last.high,
              low: last.low,
              close: last.close,
              change: diff,
              changePercent: pct,
              timeStr: formatPktDateTime(last.time),
            });
          }
          return;
        }

        const barData: any = param.seriesData.get(activeSeries);
        if (barData) {
          const o = typeof barData.open === 'number' ? barData.open : (barData.value ?? 0);
          const h = typeof barData.high === 'number' ? barData.high : (barData.value ?? o);
          const l = typeof barData.low === 'number' ? barData.low : (barData.value ?? o);
          const c = typeof barData.close === 'number' ? barData.close : (barData.value ?? o);
          const diff = c - o;
          const pct = o > 0 ? (diff / o) * 100 : 0;
          const timeNum = Number(param.time);
          const timeStr = !isNaN(timeNum) ? formatPktDateTime(timeNum) : String(param.time);

          setLegendData({
            open: o,
            high: h,
            low: l,
            close: c,
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
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      barSeriesRef.current = null;
      lineSeriesRef.current = null;
      areaSeriesRef.current = null;
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

  // Feed Data to Active Series
  useEffect(() => {
    if (!candles || candles.length === 0) return;

    // Strict validation
    const validCandles = candles
      .filter((c) =>
        Number.isFinite(c.time) && c.time > 0 &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close)
      )
      .sort((a, b) => a.time - b.time);

    if (validCandles.length === 0) return;

    // Deduplicate timestamps strictly
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
      change: diff,
      changePercent: pct,
      timeStr: formatPktDateTime(last.time),
    });
  }, [candles, chartType]);

  return (
    <div className="relative w-full h-full bg-[#131722] overflow-hidden select-none">
      {/* Real-time OHLC Legend Header */}
      <div className="absolute top-3 left-3 z-20 flex items-center flex-wrap gap-2 text-[11px] font-mono pointer-events-none bg-[#131722]/85 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-[#2a2e39]/80 shadow-md">
        <span className="font-bold text-white tracking-wide">{symbolInfo.symbol}</span>
        <span className="text-[#787b86]">{timeframe}</span>

        {legendData && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#787b86]">
              O: <span className="text-white font-medium">{legendData.open.toFixed(symbolInfo.precision)}</span>
            </span>
            <span className="text-[#787b86]">
              H: <span className="text-white font-medium">{legendData.high.toFixed(symbolInfo.precision)}</span>
            </span>
            <span className="text-[#787b86]">
              L: <span className="text-white font-medium">{legendData.low.toFixed(symbolInfo.precision)}</span>
            </span>
            <span className="text-[#787b86]">
              C: <span className="text-white font-medium">{legendData.close.toFixed(symbolInfo.precision)}</span>
            </span>
            <span
              style={{
                color: legendData.change >= 0 ? candleTheme.upColor : candleTheme.downColor,
              }}
              className="font-semibold"
            >
              {legendData.change >= 0 ? '+' : ''}
              {legendData.change.toFixed(symbolInfo.precision === 5 ? 4 : 2)} (
              {legendData.changePercent.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};
