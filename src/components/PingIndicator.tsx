import React, { useState, useEffect } from 'react';
import { Wifi } from 'lucide-react';

export const PingIndicator: React.FC = () => {
  const [ping, setPing] = useState(0);

  useEffect(() => {
    const updatePing = () => {
      // Simulate ping between 20 and 1000
      setPing(Math.floor(Math.random() * 980) + 20);
    };
    updatePing();
    const interval = setInterval(updatePing, 3000);
    return () => clearInterval(interval);
  }, []);

  const getColorClass = (p: number) => {
    if (p >= 800 && p <= 999) return 'text-rose-500'; // Bad - Red
    if (p >= 400 && p <= 550) return 'text-amber-400'; // Mid - Yellow
    if (p < 100) return 'text-emerald-400'; // Super - Green
    return 'text-sky-400'; // Default
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-[10px] font-mono shadow-xs" title={`Ping: ${ping}ms`}>
      <Wifi className={`w-3.5 h-3.5 ${getColorClass(ping)}`} />
      <span className={`${getColorClass(ping)} font-bold`}>{ping}ms</span>
    </div>
  );
};
