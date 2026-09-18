import React from 'react';
import { Palette, Check, RotateCcw, X } from 'lucide-react';
import { CandleColorTheme } from '../types/chart';
import { DEFAULT_CANDLE_THEMES, DEFAULT_THEME } from '../utils/candleColors';

interface CandleColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: CandleColorTheme;
  onChangeTheme: (theme: CandleColorTheme) => void;
}

export const CandleColorModal: React.FC<CandleColorModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onChangeTheme,
}) => {
  if (!isOpen) return null;

  const handleSelectPreset = (preset: CandleColorTheme) => {
    onChangeTheme(preset);
  };

  const handleCustomUpColor = (color: string) => {
    onChangeTheme({
      ...currentTheme,
      id: 'custom',
      name: 'Custom',
      upColor: color,
      wickUpColor: color,
    });
  };

  const handleCustomDownColor = (color: string) => {
    onChangeTheme({
      ...currentTheme,
      id: 'custom',
      name: 'Custom',
      downColor: color,
      wickDownColor: color,
    });
  };

  const handleReset = () => {
    onChangeTheme(DEFAULT_THEME);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        id="candle-color-modal"
        className="w-full max-w-md bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2e39]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2962FF]/15 border border-[#2962FF]/30 flex items-center justify-center text-[#2962FF]">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Candle Color Theme</h3>
              <p className="text-[11px] text-[#787b86]">Customize bullish & bearish chart palette</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Live Preview Bar */}
          <div className="p-4 rounded-lg bg-[#131722] border border-[#2a2e39] flex flex-col items-center justify-center gap-3">
            <span className="text-[11px] font-mono text-[#787b86] uppercase tracking-wider">Live Preview</span>
            <div className="flex items-end gap-3 h-16">
              {/* Bullish Candle */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3" style={{ backgroundColor: currentTheme.upColor }} />
                <div className="w-5 h-8 rounded-xs" style={{ backgroundColor: currentTheme.upColor }} />
                <div className="w-0.5 h-3" style={{ backgroundColor: currentTheme.upColor }} />
                <span className="text-[10px] font-mono mt-1 text-[#787b86]">Bullish</span>
              </div>

              {/* Bearish Candle */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3" style={{ backgroundColor: currentTheme.downColor }} />
                <div className="w-5 h-8 rounded-xs" style={{ backgroundColor: currentTheme.downColor }} />
                <div className="w-0.5 h-3" style={{ backgroundColor: currentTheme.downColor }} />
                <span className="text-[10px] font-mono mt-1 text-[#787b86]">Bearish</span>
              </div>
            </div>
          </div>

          {/* Theme Presets */}
          <div>
            <label className="text-xs font-semibold text-[#d1d4dc] block mb-2.5">
              Curated Palettes
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEFAULT_CANDLE_THEMES.map((theme) => {
                const isSelected = currentTheme.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelectPreset(theme)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-[#2962FF]/15 border-[#2962FF] text-white shadow-xs'
                        : 'bg-[#131722] border-[#2a2e39] text-[#d1d4dc] hover:border-[#434651]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: theme.upColor }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: theme.downColor }}
                        />
                      </div>
                      <span className="text-xs font-medium">{theme.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#2962FF]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Pickers */}
          <div className="pt-2 border-t border-[#2a2e39]">
            <label className="text-xs font-semibold text-[#d1d4dc] block mb-3">
              Custom Candle Colors
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Bullish Color */}
              <div className="p-3 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[#d1d4dc] block">Bullish (Up)</span>
                  <span className="text-[10px] font-mono text-[#787b86] uppercase">{currentTheme.upColor}</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="color"
                    value={currentTheme.upColor}
                    onChange={(e) => handleCustomUpColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  />
                </div>
              </div>

              {/* Bearish Color */}
              <div className="p-3 rounded-lg bg-[#131722] border border-[#2a2e39] flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[#d1d4dc] block">Bearish (Down)</span>
                  <span className="text-[10px] font-mono text-[#787b86] uppercase">{currentTheme.downColor}</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="color"
                    value={currentTheme.downColor}
                    onChange={(e) => handleCustomDownColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#2a2e39] bg-[#1a1d26]">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-[#787b86] hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#2962FF] hover:bg-[#1e53e5] text-white text-xs font-semibold transition-colors shadow-xs"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
