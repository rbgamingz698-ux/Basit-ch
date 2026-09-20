export type IndicatorCategory = 'TREND' | 'MOMENTUM' | 'VOLUME' | 'SMART_MONEY_CONCEPTS' | 'CUSTOM' | 'VOLUMATIC';

export interface IndicatorDefinition {
  id: string;
  name: string;
  category: IndicatorCategory;
  description: string;
  defaultInputs: Record<string, any>;
  defaultStyle: Record<string, any>;
  defaultVisibility: Record<string, boolean>;
  scriptCode?: string;
}

export interface IndicatorInstance {
  instanceId: string;
  definitionId: string;
  name: string;
  category: IndicatorCategory;
  enabled: boolean;
  visible: boolean;
  inputs: Record<string, any>;
  style: Record<string, any>;
  visibility: Record<string, boolean>;
  scriptCode?: string;
  plotColor?: string;
}

export interface SavedCustomScript {
  id: string;
  name: string;
  description: string;
  code: string;
  createdAt: number;
  updatedAt: number;
}

export interface FVGItem {
  id: string;
  type: 'bullish' | 'bearish';
  topPrice: number;
  bottomPrice: number;
  startTime: number;
  endTime: number;
  color: string;
}

export interface SessionBoxItem {
  id: string;
  name: 'Asia' | 'London' | 'New York';
  startTime: number;
  endTime: number;
  high: number;
  low: number;
  color: string;
  borderColor: string;
}

export interface OrderBlockItem {
  id: string;
  type: 'bullish' | 'bearish';
  topPrice: number;
  bottomPrice: number;
  startTime: number;
  endTime: number;
  color: string;
  hasBOS?: boolean;
  hasFVG?: boolean;
  hasSweep?: boolean;
  inSession?: boolean;
  sessionName?: 'Asia' | 'London' | 'New York';
}

export interface StructureLevel {
  id: string;
  type: 'BOS_BULL' | 'BOS_BEAR' | 'CHoCH_BULL' | 'CHoCH_BEAR';
  price: number;
  time: number;
  label: string;
  color: string;
}

export interface LiquidityZoneItem {
  id: string;
  price: number;
  label: string;
  color: string;
  time: number;
  endTime?: number;
  category: 'DAY_HL' | 'SESSION_HL' | 'EQ_3TOUCH';
  touchesCount?: number;
  isSwept?: boolean;
  sweepTime?: number;
  sweepPrice?: number;
  originTime?: number;
  originPrice?: number;
  sweepExtremePrice?: number;
  sweepDiff?: number;
  sweepDirection?: 'high_sweep' | 'low_sweep';
}

export interface TrendlineLiquidityItem {
  id: string;
  label: string;
  color: string;
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
  touchesCount: number;
  type: 'resistance' | 'support';
}

export interface VolumaticORBItem {
  id: string;
  dateStr: string;
  startTime: number;
  endTime: number;
  high: number;
  low: number;
  color: string;
  borderColor: string;
  isBrokenUp: boolean;
  isBrokenDown: boolean;
  breakoutUpTime?: number;
  breakoutDownTime?: number;
  endOfDayTime: number;
}
