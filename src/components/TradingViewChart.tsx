import React, { useEffect, useRef, useState, useImperativeHandle } from 'react';
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
import { Eye, EyeOff, Sliders, X, Tag } from 'lucide-react';
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

export const TradingViewChart = React.forwardRef<
  { resetToLive: () => void },
  RealtimeCandleChartProps
>(({
  symbolInfo,
  timeframe,
  chartType,
  candles,
  candleTheme,
}, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Expose resetToLive to parent
  useImperativeHandle(ref, () => ({
    resetToLive: () => {
      if (chartRef.current && candles && candles.length > 0) {
        chartRef.current.timeScale().scrollToRealTime();
        const totalBars = candles.length;
        const fromIndex = Math.max(0, totalBars - 65);
        const toIndex = totalBars + 6;
        chartRef.current.timeScale().setVisibleLogicalRange({ from: fromIndex, to: toIndex });
      }
    },
  }));

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

  // Candle Countdown Timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    const updateCountdown = () => {
      if (!candles || candles.length === 0) return;
      const lastCandle = candles[candles.length - 1];
      const tfLower = timeframe.toLowerCase();
      const tfSecs = tfLower === '1m' ? 60 : tfLower === '5m' ? 300 : tfLower === '15m' ? 900 : tfLower === '1h' ? 3600 : tfLower === '4h' ? 14400 : 86400;
      
      const nowSecs = Math.floor(Date.now() / 1000);
      const nextCandleTime = lastCandle.time + tfSecs;
      const remaining = nextCandleTime - nowSecs;
      setSecondsRemaining(Math.max(0, remaining));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [candles, timeframe]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
        background: { type: ColorType.Solid, color: '#000000' },
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
          color: '#FFFFFF',
          width: 1,
          style: 3,
          labelBackgroundColor: '#FFFFFF',
        },
        horzLine: {
          color: '#FFFFFF',
          width: 1,
          style: 3,
          labelBackgroundColor: '#FFFFFF',
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
        
        // Find candle at hovered time - more accurate than searching all
        // Lightweight-charts provides series data directly
        const seriesData = param.seriesData.get(candlestickSeriesRef.current!) as any || 
                           param.seriesData.get(barSeriesRef.current!) as any || 
                           param.seriesData.get(lineSeriesRef.current!) as any ||
                           param.seriesData.get(areaSeriesRef.current!) as any;

        if (seriesData) {
            const timeStr = formatPktDateTime(tNum);
            
            // For candlesticks/bars, price is O/H/L/C, for line/area it's just 'value'
            const open = seriesData.open ?? seriesData.value;
            const high = seriesData.high ?? seriesData.value;
            const low = seriesData.low ?? seriesData.value;
            const close = seriesData.close ?? seriesData.value;
            
            const prev = open; // Approximate diff based on candle
            const diff = close - prev;
            const pct = prev > 0 ? (diff / prev) * 100 : 0;
            
            setLegendData({
                open, high, low, close,
                volume: seriesData.volume ?? 0,
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

  const formatVolume = (v: number) => {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
    if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
    return v.toString();
  };

  return (
    <div className="relative w-full h-full bg-[#131722] overflow-hidden select-none">
      {/* Chart Canvas */}
      <div 
        ref={chartContainerRef} 
        className="w-full h-full" 
      />
    </div>
  );
});
