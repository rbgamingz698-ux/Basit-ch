export type MagnetMode = 'none' | 'off' | 'weak' | 'strong';

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface DrawingItem {
  id: string;
  type: string;
  points: DrawingPoint[];
  color?: string;
  lineWidth?: number;
}
