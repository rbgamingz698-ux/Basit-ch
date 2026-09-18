export type ChartType = 'Candlestick' | 'Bar' | 'Line' | 'Heikin-Ashi' | 'Area' | 'Baseline';

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

export interface CandleColorTheme {
  id: string;
  name: string;
  upColor: string;
  downColor: string;
  wickUpColor?: string;
  wickDownColor?: string;
}

export interface SymbolInfo {
  symbol: string;         // e.g. 'US30'
  displayName: string;    // e.g. 'US Wall Street 30'
  ticker?: string;        // ticker code
  exchange: string;       // 'INDEX' / 'FOREX' / 'COMMODITY'
  precision: number;      // decimals e.g. 2 for US30, 5 for EUR/USD
  pipSize: number;        // point size e.g. 1.0 or 0.0001
  basePrice: number;      // baseline price
  type: 'index' | 'forex' | 'crypto' | 'commodity';
}

export interface CandleData {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LiquidityLayersConfig {
  master: boolean;              // Master toggle
  pdhPdl: boolean;              // Previous Day High / Low (Buy/Sell Side Liquidity)
  equalHighsLows: boolean;      // Equal Highs (Green) / Equal Lows (Red)
  fiveTouchTrendline: boolean;  // 5-Touch Trendlines (Yellow)
  sessionBoxes: boolean;        // Asia, London, NY High/Low range boxes
  fairValueGaps: boolean;       // Fair Value Gaps (FVG)
}

export interface PDH_PDL_Level {
  pdh: number;
  pdl: number;
  pdhLabel: string;
  pdlLabel: string;
  pdhSwept: boolean;
  pdlSwept: boolean;
  distanceToPdhPoints: number;
  distanceToPdlPoints: number;
}

export interface EqualLevel {
  id: string;
  type: 'EQH' | 'EQL';
  price: number;
  touchCount: number;
  tolerance: number;
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  label: string;
  color: string;
}

export interface FiveTouchTrendline {
  id: string;
  type: 'support' | 'resistance';
  touches: number;
  startPoint: { time: number; price: number };
  endPoint: { time: number; price: number };
  slope: number;
  label: string;
  color: string;
}

export interface SessionBox {
  id: string;
  name: 'Asia' | 'London' | 'New York';
  startTime: number;
  endTime: number;
  high: number;
  low: number;
  color: string;
  borderColor: string;
}

export interface FairValueGap {
  id: string;
  type: 'bullish' | 'bearish';
  topPrice: number;
  bottomPrice: number;
  startTime: number;
  endTime: number;
}

export interface IndicatorSettings {
  ema20: boolean;
  ema50: boolean;
  ema200: boolean;
  bollingerBands: boolean;
  rsi: boolean;
  macd: boolean;
  volume: boolean;
}

export type DrawingTool = 
  | 'cursor' 
  | 'crosshair' 
  | 'trendline' 
  | 'horizontalLine' 
  | 'horizontalRay' 
  | 'rectangle' 
  | 'fibonacci' 
  | 'text' 
  | 'measure';

export interface UserDrawing {
  id: string;
  tool: DrawingTool;
  points: { time: number; price: number; x?: number; y?: number }[];
  text?: string;
  color: string;
  width?: number;
  createdAt: number;
}

export type SplitLayout = '1';

export interface ChartPaneConfig {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
}

export interface ForexNewsItem {
  title: string;
  country: string;
  currency: string;
  date: string;
  time?: string;
  formattedTime: string;
  formattedDate: string;
  countdown: string;
  impact: 'Low' | 'Medium' | 'High' | 'Holiday' | string;
  impactLabel: string;
  forecast?: string;
  previous?: string;
  actual?: string;
  timestamp: number;
  isFuture: boolean;
  thaiTime?: string; // backwards compatibility
  thaiDate?: string;
  karachiTime?: string;
  impactThai?: string;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'crossing' | 'crossing_up' | 'crossing_down';
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  note?: string;
  color: string;
  active: boolean;
}
