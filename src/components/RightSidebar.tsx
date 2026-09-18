import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Flame,
  Globe,
  ChevronRight,
  ChevronLeft,
  Filter,
  Newspaper
} from 'lucide-react';
import { ForexNewsItem, StockNewsItem } from '../types/chart';
import { fetchUpcomingForexNews, ENGLISH_IMPACT_MAP } from '../utils/forexNews';
import { fetchStockNews, isGeopolitical, StockNewsCategory } from '../utils/stockNews';
import { SUPPORTED_SYMBOLS } from '../services/marketData';

interface RightSidebarProps {
  currentSymbol: string;
  onSelectSymbol: (sym: string) => void;
  lastPrice: number;
  priceChange: number;
  futureNewsCount?: number;
  onNewsCountChange?: (count: number) => void;
