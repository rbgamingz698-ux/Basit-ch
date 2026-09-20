/**
 * Financial Sentiment & Symbol Impact Analyzer
 * Determines impact of news headlines on user symbols:
 * - YM: Dow Jones E-mini Futures (^DJI / US30)
 * - NQ: Nasdaq 100 E-mini Futures (^IXIC)
 * - GC: Gold Futures (COMEX GC=F / XAU)
 * 
 * Mapping:
 * - 🚀 = Bullish impact ("Bull")
 * - 🪙 = Bearish impact ("Bear")
 */

export type SentimentType = 'bull' | 'bear' | 'neutral';

export interface SymbolImpact {
  symbol: 'YM' | 'NQ' | 'GC';
  name: string;
  sentiment: 'bull' | 'bear';
  emoji: '🚀' | '🪙';
  label: 'Bull' | 'Bear';
  confidence: number;
  reason: string;
}

export interface NewsImpactAnalysis {
  primarySentiment: SentimentType;
  primaryEmoji: '🚀' | '🪙' | '⚖️';
  primaryLabel: 'Bull' | 'Bear' | 'Neutral';
  impactedSymbols: SymbolImpact[];
  summaryBadge: string;
}

// Keyword dictionaries
const BULL_KEYWORDS = [
  'surge', 'jump', 'rally', 'soar', 'gain', 'climb', 'record high', 'breakout',
  'beat', 'top', 'strong', 'boom', 'rebound', 'advance', 'bull', 'upgrade',
  'rate cut', 'easing', 'cooling inflation', 'stimulus', 'revenue beat',
  'profit surge', 'optimism', 'dividend hike', 'expansion', 'buyback'
];

const BEAR_KEYWORDS = [
  'plunge', 'drop', 'slump', 'tumble', 'fall', 'sink', 'selloff', 'crash',
  'miss', 'weak', 'drag', 'decline', 'bear', 'downgrade', 'hike', 'inflation surge',
  'tariff', 'war', 'escalate', 'strike', 'conflict', 'recession', 'default',
  'layoff', 'debt', 'curb', 'ban', 'sanction', 'crisis', 'risk-off'
];

const YM_KEYWORDS = [
  'dow', 'djia', 'us30', 'blue chip', 'industrial', 'caterpillar', 'boeing',
  'goldman', 'jpmorgan', 'bank', 'economy', 'manufacturing', 'gdp', 'payroll'
];

const NQ_KEYWORDS = [
  'nasdaq', 'tech', 'ai', 'semiconductor', 'chip', 'nvidia', 'apple', 'microsoft',
  'alphabet', 'google', 'meta', 'amazon', 'tesla', 'cloud', 'yield'
];

const GC_KEYWORDS = [
  'gold', 'bullion', 'xau', 'metal', 'safe haven', 'inflation hedge', 'dollar drops',
  'central bank buy', 'geopolitical tension', 'middle east', 'treasury yield drops'
];

export function analyzeArticleImpact(title: string, publisher?: string): NewsImpactAnalysis {
  const text = (title + ' ' + (publisher || '')).toLowerCase();

  let bullScore = 0;
  let bearScore = 0;

  for (const kw of BULL_KEYWORDS) {
    if (text.includes(kw)) bullScore += 1.5;
  }

  for (const kw of BEAR_KEYWORDS) {
    if (text.includes(kw)) bearScore += 1.5;
  }

  // Symbol relevances
  const isYm = YM_KEYWORDS.some((kw) => text.includes(kw)) || text.includes('stock') || text.includes('market') || text.includes('fed');
  const isNq = NQ_KEYWORDS.some((kw) => text.includes(kw)) || text.includes('tech') || text.includes('ai');
  const isGc = GC_KEYWORDS.some((kw) => text.includes(kw)) || text.includes('gold') || text.includes('geopolitic') || text.includes('war');

  const impactedSymbols: SymbolImpact[] = [];

  // 1. GC (Gold)
  if (isGc || text.includes('war') || text.includes('tension') || text.includes('crisis')) {
    // Geopolitical crisis / war / rate cut is Bullish for Gold (🚀)
    const isGoldBull = bullScore >= bearScore || text.includes('war') || text.includes('tension') || text.includes('gold') && !text.includes('drop');
    impactedSymbols.push({
      symbol: 'GC',
      name: 'Gold Futures',
      sentiment: isGoldBull ? 'bull' : 'bear',
      emoji: isGoldBull ? '🚀' : '🪙',
      label: isGoldBull ? 'Bull' : 'Bear',
      confidence: 85,
      reason: isGoldBull ? 'Safe-haven demand & inflation hedge' : 'Dollar strength / rate pressure',
    });
  }

  // 2. YM (Dow)
  if (isYm) {
    const isYmBull = bullScore > bearScore;
    impactedSymbols.push({
      symbol: 'YM',
      name: 'Dow Mini (US30)',
      sentiment: isYmBull ? 'bull' : 'bear',
      emoji: isYmBull ? '🚀' : '🪙',
      label: isYmBull ? 'Bull' : 'Bear',
      confidence: 80,
      reason: isYmBull ? 'Blue-chip industrial momentum' : 'Macro / rate headwinds on cyclicals',
    });
  }

  // 3. NQ (Nasdaq)
  if (isNq) {
    const isNqBull = bullScore > bearScore;
    impactedSymbols.push({
      symbol: 'NQ',
      name: 'Nasdaq 100',
      sentiment: isNqBull ? 'bull' : 'bear',
      emoji: isNqBull ? '🚀' : '🪙',
      label: isNqBull ? 'Bull' : 'Bear',
      confidence: 82,
      reason: isNqBull ? 'Tech & AI sentiment expansion' : 'Yield pressure / tech valuation contraction',
    });
  }

  // Default fallback if no specific symbol triggered
  if (impactedSymbols.length === 0) {
    const isGeneralBull = bullScore >= bearScore;
    impactedSymbols.push({
      symbol: 'YM',
      name: 'Dow Mini',
      sentiment: isGeneralBull ? 'bull' : 'bear',
      emoji: isGeneralBull ? '🚀' : '🪙',
      label: isGeneralBull ? 'Bull' : 'Bear',
      confidence: 70,
      reason: isGeneralBull ? 'Broader market rally' : 'Broader market sell-off',
    });
  }

  const primaryImpact = impactedSymbols[0];
  const primarySentiment = primaryImpact.sentiment;
  const primaryEmoji = primaryImpact.emoji;
  const primaryLabel = primaryImpact.label;

  const summaryBadge = `${primaryImpact.symbol} ${primaryEmoji} ${primaryLabel}`;

  return {
    primarySentiment,
    primaryEmoji,
    primaryLabel,
    impactedSymbols,
    summaryBadge,
  };
}

/**
 * Aggregates overall market sentiment across multiple articles
 */
export function aggregateSymbolSentiments(articles: { title: string; publisher?: string }[]): {
  ym: { sentiment: 'bull' | 'bear'; emoji: '🚀' | '🪙'; score: number };
  nq: { sentiment: 'bull' | 'bear'; emoji: '🚀' | '🪙'; score: number };
  gc: { sentiment: 'bull' | 'bear'; emoji: '🚀' | '🪙'; score: number };
} {
  let ymBulls = 0, ymTotal = 0;
  let nqBulls = 0, nqTotal = 0;
  let gcBulls = 0, gcTotal = 0;

  articles.forEach((a) => {
    const analysis = analyzeArticleImpact(a.title, a.publisher);
    analysis.impactedSymbols.forEach((s) => {
      if (s.symbol === 'YM') {
        ymTotal++;
        if (s.sentiment === 'bull') ymBulls++;
      } else if (s.symbol === 'NQ') {
        nqTotal++;
        if (s.sentiment === 'bull') nqBulls++;
      } else if (s.symbol === 'GC') {
        gcTotal++;
        if (s.sentiment === 'bull') gcBulls++;
      }
    });
  });

  const ymRatio = ymTotal > 0 ? ymBulls / ymTotal : 0.65;
  const nqRatio = nqTotal > 0 ? nqBulls / nqTotal : 0.58;
  const gcRatio = gcTotal > 0 ? gcBulls / gcTotal : 0.72;

  return {
    ym: {
      sentiment: ymRatio >= 0.5 ? 'bull' : 'bear',
      emoji: ymRatio >= 0.5 ? '🚀' : '🪙',
      score: Math.round(ymRatio * 100),
    },
    nq: {
      sentiment: nqRatio >= 0.5 ? 'bull' : 'bear',
      emoji: nqRatio >= 0.5 ? '🚀' : '🪙',
      score: Math.round(nqRatio * 100),
    },
    gc: {
      sentiment: gcRatio >= 0.5 ? 'bull' : 'bear',
      emoji: gcRatio >= 0.5 ? '🚀' : '🪙',
      score: Math.round(gcRatio * 100),
    },
  };
}
