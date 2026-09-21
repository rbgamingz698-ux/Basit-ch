import React, { useState } from 'react';

interface SymbolLogoProps {
  symbol: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const SymbolLogo: React.FC<SymbolLogoProps> = ({
  symbol,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: 'w-4 h-4 text-[9px]',
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-7 h-7 text-xs',
    lg: 'w-9 h-9 text-sm',
  }[size];

  const norm = (symbol || '').toUpperCase();

  // TradingView logo for search bar / brand
  if (norm === 'TRADINGVIEW' || norm === 'TV') {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-md bg-[#131722] border border-[#2a2e39] overflow-hidden shrink-0 ${sizeClasses} ${className}`}
        title="TradingView"
      >
        {!imgError ? (
          <img
            src="https://cdn.jsdelivr.net/npm/@thesvg/icons/icons/tradingview.svg"
            alt="TradingView"
            className="w-full h-full object-contain p-0.5 filter invert"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <svg viewBox="0 0 36 28" fill="none" className="w-full h-full p-1 text-white">
            <path
              d="M0 6a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6V6z"
              fill="#2962FF"
            />
            <path
              d="M7 9h6v3H7V9zm0 5h6v3H7v-3zm9-5h6v10h-6V9zm9 0h6v6h-6V9z"
              fill="#FFFFFF"
            />
          </svg>
        )}
      </div>
    );
  }

  // DJI (Dow Jones) - S&P Dow Jones dark navy badge with stylized "DJ" and trendline
  if (norm === 'DJI' || norm === '^DJI') {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#0c2340] to-[#041122] border border-[#1d3d63] shadow-inner text-white font-black shrink-0 select-none ${sizeClasses} ${className}`}
        title="Dow Jones Industrial Average"
      >
        <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none">
          <circle cx="16" cy="16" r="15" fill="#0A2240" stroke="#1E4472" strokeWidth="1.5" />
          <path
            d="M7 11h4.5c2.5 0 4.5 1.8 4.5 4.5s-2 4.5-4.5 4.5H7V11zm3.2 6.5h1.2c1.2 0 2-.8 2-2s-.8-2-2-2h-1.2v4z"
            fill="#FFFFFF"
          />
          <path
            d="M17.5 11h3v6.5c0 1.8-.8 2.5-2.2 2.5h-1.3v-2.3h.8c.4 0 .7-.2.7-.8V11z"
            fill="#00E676"
          />
        </svg>
      </div>
    );
  }

  // YM (Dow Futures - CBOT / CME Group)
  if (norm === 'YM' || norm === 'YM=F') {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#024072] to-[#001d36] border border-[#0284c7] shadow-inner text-white font-black shrink-0 select-none ${sizeClasses} ${className}`}
        title="Dow E-mini Futures (CBOT)"
      >
        <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none">
          <circle cx="16" cy="16" r="15" fill="#034B80" stroke="#38BDF8" strokeWidth="1.5" />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="12"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            letterSpacing="-0.5"
          >
            YM
          </text>
        </svg>
      </div>
    );
  }

  // NQ (Nasdaq-100 Futures - CME / Nasdaq)
  if (norm === 'NQ' || norm === 'NQ=F' || norm === 'IXIC' || norm === 'NAS100') {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#0055b8] to-[#00264d] border border-[#0091ff] shadow-inner text-white font-black shrink-0 select-none ${sizeClasses} ${className}`}
        title="Nasdaq-100 Futures (CME/CBOT)"
      >
        <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none">
          <circle cx="16" cy="16" r="15" fill="#0057B7" stroke="#60A5FA" strokeWidth="1.5" />
          {/* Nasdaq stylized Q ribbon mark */}
          <circle cx="16" cy="15" r="7" stroke="#FFFFFF" strokeWidth="2.4" fill="none" />
          <path
            d="M17.5 17.5L23 23"
            stroke="#00E5FF"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <text
            x="16"
            y="17"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="8"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
          >
            NQ
          </text>
        </svg>
      </div>
    );
  }

  // GC (Gold Futures - COMEX) - Lustrous Gold Bullion / Ingot
  if (norm === 'GC' || norm === 'GC=F' || norm === 'GOLD' || norm === 'XAUUSD') {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#d97706] via-[#f59e0b] to-[#b45309] border border-[#fbbf24] shadow-inner text-amber-950 font-black shrink-0 select-none ${sizeClasses} ${className}`}
        title="Gold Futures (COMEX)"
      >
        <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none">
          <circle cx="16" cy="16" r="15" fill="url(#goldGrad)" stroke="#FDE047" strokeWidth="1.5" />
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F59E0B" />
              <stop offset="0.5" stopColor="#FBBF24" />
              <stop offset="1" stopColor="#B45309" />
            </linearGradient>
          </defs>
          {/* Gold Ingot / Au mark */}
          <path
            d="M9 13.5L12 9.5h8l3 4-2 7H11l-2-7z"
            fill="#FFFBEB"
            fillOpacity="0.9"
            stroke="#78350F"
            strokeWidth="1"
          />
          <text
            x="16"
            y="17.5"
            textAnchor="middle"
            fill="#78350F"
            fontSize="8"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
          >
            AU
          </text>
        </svg>
      </div>
    );
  }

  // CL (Crude Oil Futures - NYMEX) - Petroleum drop & NYMEX energy mark
  if (norm === 'CL' || norm === 'CL=F' || norm === 'OIL' || norm === 'WTI') {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] border border-[#475569] shadow-inner text-sky-400 font-black shrink-0 select-none ${sizeClasses} ${className}`}
        title="Crude Oil Futures (NYMEX)"
      >
        <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none">
          <circle cx="16" cy="16" r="15" fill="#0F172A" stroke="#64748B" strokeWidth="1.5" />
          {/* Oil droplet with cyan glossy sheen */}
          <path
            d="M16 6.5C16 6.5 10 14.5 10 18.5a6 6 0 0 0 12 0c0-4-6-12-6-12z"
            fill="url(#oilGrad)"
          />
          <path
            d="M14 17a2.5 2.5 0 0 1 2.5-2.5"
            stroke="#BAE6FD"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="oilGrad" x1="10" y1="6" x2="22" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="0.7" stopColor="#0284C7" />
              <stop offset="1" stopColor="#0369A1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Default fallback asset badge
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-[#1e222d] border border-[#2a2e39] text-[#2962FF] font-black shrink-0 select-none ${sizeClasses} ${className}`}
    >
      {norm.slice(0, 2)}
    </div>
  );
};
