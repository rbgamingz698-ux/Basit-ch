import { CandleColorTheme } from '../types/chart';

export const DEFAULT_CANDLE_THEMES: CandleColorTheme[] = [
  {
    id: 'default',
    name: 'Default (Green & Purple)',
    upColor: '#00FF00',
    downColor: '#8A2BE2',
    wickUpColor: '#00FF00',
    wickDownColor: '#8A2BE2',
  },
  {
    id: 'classic',
    name: 'TradingView Classic',
    upColor: '#22ab94',
    downColor: '#f23645',
    wickUpColor: '#22ab94',
    wickDownColor: '#f23645',
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    upColor: '#00f2fe',
    downColor: '#fe0979',
    wickUpColor: '#00f2fe',
    wickDownColor: '#fe0979',
  },
  {
    id: 'emerald-coral',
    name: 'Emerald & Coral',
    upColor: '#10b981',
    downColor: '#ef4444',
    wickUpColor: '#10b981',
    wickDownColor: '#ef4444',
  },
  {
    id: 'slate-rose',
    name: 'Sky & Rose',
    upColor: '#38bdf8',
    downColor: '#fb7185',
    wickUpColor: '#38bdf8',
    wickDownColor: '#fb7185',
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    upColor: '#f8fafc',
    downColor: '#475569',
    wickUpColor: '#cbd5e1',
    wickDownColor: '#475569',
  },
  {
    id: 'amber-purple',
    name: 'Amber & Purple',
    upColor: '#fbbf24',
    downColor: '#a855f7',
    wickUpColor: '#fbbf24',
    wickDownColor: '#a855f7',
  },
];

export const DEFAULT_THEME = DEFAULT_CANDLE_THEMES[0];

