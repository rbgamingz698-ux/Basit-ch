import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function yahooChartPlugin(): Plugin {
  return {
    name: 'yahoo-chart-plugin',
    configureServer(server) {
      server.middlewares.use('/api/chart', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          let symbol = url.searchParams.get('symbol') || '^DJI';
          const interval = url.searchParams.get('interval') || '5m';
          const range = url.searchParams.get('range') || (interval === '1m' ? '1d' : '5d');

          // Normalize symbol shorthand
          if (symbol === 'US30') symbol = '^DJI';
          if (symbol === 'NASDAQ' || symbol === 'US100') symbol = '^IXIC';
          if (symbol === 'BT_GC=F') symbol = 'GC=F';

          const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;

          const response = await fetch(yahooUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
            },
          });

          const data = await response.text();
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(data);
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: err?.message || 'Server error' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), yahooChartPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: false,
      watch: null,
      proxy: {
        '/api/yahoo-chart': {
          target: 'https://query1.finance.yahoo.com',
          changeOrigin: true,
          secure: false,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
          },
          rewrite: (p) => p.replace(/^\/api\/yahoo-chart/, '/v8/finance/chart'),
        },
        '/api/forex-news-json': {
          target: 'https://nfs.faireconomy.media',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/forex-news-json/, '/ff_calendar_thisweek.json'),
        },
      },
    },
  };
});
