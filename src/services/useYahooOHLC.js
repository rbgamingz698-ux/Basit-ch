// useYahooOHLC.js
export async function getYahooOHLC(symbol, interval = '5m') {
  let querySymbol = symbol;
  if (symbol === 'US30') querySymbol = '^DJI';
  if (symbol === 'NASDAQ' || symbol === 'US100') querySymbol = '^IXIC';

  const range = interval === '1m' ? '1d' : '5d';
  const encoded = encodeURIComponent(querySymbol);

  const endpoints = [
    `/api/chart?symbol=${encoded}&interval=${interval}&range=${range}`,
    `/api/yahoo-chart/${encoded}?interval=${interval}&range=${range}`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=${interval}&range=${range}`
  ];

  let data = null;
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        data = await res.json();
        if (data?.chart?.result?.[0]?.timestamp?.length > 0) break;
      }
    } catch (e) {}
  }

  if (!data?.chart?.result?.[0]) return [];

  const result = data.chart.result[0];
  const timestamps = result.timestamp || [];
  const ohlc = result.indicators?.quote?.[0] || {};

  return timestamps.map((t, i) => ({
    time: t,
    open: ohlc.open ? ohlc.open[i] : null,
    high: ohlc.high ? ohlc.high[i] : null,
    low: ohlc.low ? ohlc.low[i] : null,
    close: ohlc.close ? ohlc.close[i] : null,
    volume: ohlc.volume ? ohlc.volume[i] : 1000
  })).filter(c => c.open != null && !isNaN(c.open));
}

export default getYahooOHLC;
