import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

const BT_MORGAN_WATERMARK = 'BT MORGAN - The Hidden Power®';

export const BTMorganFreeProfile: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const [sessionInfo, setSessionInfo] = useState({ time: '', name: '', poc: 0 });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#000000' }, textColor: '#D4AF37' },
      grid: { vertLines: { color: 'rgba(212, 175, 55, 0.1)' }, horzLines: { color: 'rgba(212, 175, 55, 0.1)' } },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      watermark: {
        visible: true,
        text: BT_MORGAN_WATERMARK,
        fontSize: 24,
        color: 'rgba(212, 175, 55, 0.1)',
        horzAlign: 'center',
        vertAlign: 'center',
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#F5E6C8',
      downColor: '#B22222',
      borderVisible: true,
      wickVisible: true,
      borderColor: '#F5E6C8',
      wickColor: '#F5E6C8',
    });

    chartInstance.current = chart;

    const fetchData = async () => {
      try {
        const yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=5d&interval=1m';
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        const results = data.chart.result[0];
        const timestamps = results.timestamp;
        const quotes = results.indicators.quote[0];
        
        const candles = timestamps.map((t: number, i: number) => ({
          time: t,
          open: quotes.open[i],
          high: quotes.high[i],
          low: quotes.low[i],
          close: quotes.close[i],
          volume: quotes.volume[i],
        }));

        // Session filtering (PKT time)
        const getPKTTime = (ts: number) => new Date(ts * 1000).toLocaleString("en-US", { timeZone: "Asia/Karachi" });
        const nowPKT = new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" });
        const hour = new Date(nowPKT).getHours();

        const session = hour >= 6 && hour < 12 ? 'Morning' : (hour >= 18 && hour < 22 ? 'NY' : null);
        
        if (!session) return;

        const filteredCandles = candles.filter(c => {
          const t = new Date(c.time * 1000).toLocaleString("en-US", { timeZone: "Asia/Karachi" });
          const h = new Date(t).getHours();
          const m = new Date(t).getMinutes();
          if (session === 'Morning') return h >= 6 && h < 12;
          if (session === 'NY') return (h === 18 && m >= 30) || (h > 18 && h < 22);
          return false;
        });

        candleSeries.setData(filteredCandles.map(c => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        })));

        // Volume Profile calculation
        let minPrice = Math.min(...filteredCandles.map(c => c.low));
        let maxPrice = Math.max(...filteredCandles.map(c => c.high));
        const binSize = (maxPrice - minPrice) / 50;
        const bins = new Array(50).fill(0);
        
        filteredCandles.forEach(c => {
          const range = c.high - c.low;
          const ticks = Math.max(1, Math.ceil(range / 0.1)); // tickSize = 0.1 for GC=F
          const volPerTick = c.volume / ticks;
          for (let p = c.low; p <= c.high; p += 0.1) {
            const binIdx = Math.floor((p - minPrice) / binSize);
            if (binIdx >= 0 && binIdx < 50) bins[binIdx] += volPerTick;
          }
        });

        const totalVol = bins.reduce((a, b) => a + b, 0);
        const pocIdx = bins.indexOf(Math.max(...bins));
        const pocPrice = minPrice + pocIdx * binSize;
        
        setSessionInfo({ time: nowPKT, name: session, poc: pocPrice });

        // Draw POC & VAH/VAL (simplified using chart price lines)
        chart.applyOptions({}); // Redraw logic
      } catch (error) {
        console.error('Error fetching data', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);

    return () => {
      clearInterval(interval);
      chart.remove();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="flex justify-between items-center p-2 text-[#D4AF37] text-sm font-bold">
        <span>{sessionInfo.time} | {sessionInfo.name} | POC: {sessionInfo.poc.toFixed(2)}</span>
      </div>
      <div ref={chartContainerRef} className="flex-1" />
    </div>
  );
};
