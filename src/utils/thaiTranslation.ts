export type Language = 'EN' | 'TH';

export interface Translations {
  theme: string;
  indicators: string;
  marketOpen: string;
  marketClosed: string;
  yahooFinance: string;
  searchSymbol: string;
  live: string;
  watchlist: string;
  economicNews: string;
}

const enTranslations: Translations = {
  theme: 'Theme',
  indicators: 'Indicators',
  marketOpen: 'MARKET OPEN',
  marketClosed: 'MARKET CLOSED',
  yahooFinance: 'Yahoo Finance',
  searchSymbol: 'Search Symbol',
  live: 'Live',
  watchlist: 'Watchlist',
  economicNews: 'Economic News',
};

const thTranslations: Translations = {
  theme: 'ธีมสี',
  indicators: 'อินดิเคเตอร์',
  marketOpen: 'ตลาดเปิด',
  marketClosed: 'ตลาดปิด',
  yahooFinance: 'ยาฮู ไฟแนนซ์',
  searchSymbol: 'ค้นหาหุ้น/สินทรัพย์',
  live: 'สด',
  watchlist: 'รายการเฝ้าดู',
  economicNews: 'ข่าวเศรษฐกิจ',
};

export function getTranslation(lang: Language = 'EN'): Translations {
  return lang === 'TH' ? thTranslations : enTranslations;
}
