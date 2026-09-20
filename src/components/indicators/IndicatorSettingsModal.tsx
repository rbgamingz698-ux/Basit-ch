import React, { useState } from 'react';
import { X, Sliders, Check, Tag, CheckSquare, Eye, Sparkles } from 'lucide-react';
import { IndicatorInstance } from '../../types/indicators';

interface IndicatorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instance: IndicatorInstance | null;
  onSave: (updated: IndicatorInstance) => void;
}

export const IndicatorSettingsModal: React.FC<IndicatorSettingsModalProps> = ({
  isOpen,
  onClose,
  instance,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'Inputs' | 'Labels' | 'Style' | 'Visibility'>('Inputs');
  const [currentInstance, setCurrentInstance] = useState<IndicatorInstance | null>(instance);

  React.useEffect(() => {
    setCurrentInstance(instance);
  }, [instance]);

  if (!isOpen || !currentInstance) return null;

  const handleInputChange = (key: string, value: any) => {
    setCurrentInstance({
      ...currentInstance,
      inputs: { ...currentInstance.inputs, [key]: value }
    });
  };

  const handleStyleChange = (key: string, value: any) => {
    setCurrentInstance({
      ...currentInstance,
      style: { ...currentInstance.style, [key]: value }
    });
  };

  const handleVisibilityChange = (key: string, value: boolean) => {
    setCurrentInstance({
      ...currentInstance,
      visibility: { ...currentInstance.visibility, [key]: value }
    });
  };

  const handleSave = () => {
    onSave(currentInstance);
    onClose();
  };

  const showLabels = currentInstance.inputs.showLabels ?? true;
  const labelHighlightBg = currentInstance.inputs.labelHighlightBg ?? true;

  // Compute live preview string for the label
  const renderPreviewLabel = () => {
    if (!showLabels) {
      return (
        <span className="text-zinc-500 italic text-xs">
          (Labels are currently turned OFF. No label will be drawn on chart.)
        </span>
      );
    }

    if (currentInstance.definitionId === 'order_blocks') {
      const showChecklist = currentInstance.inputs.showChecklistLabel ?? true;
      const showTitle = currentInstance.inputs.obLabelTitle ?? true;
      const showPrice = currentInstance.inputs.obLabelPrice ?? true;
      const showSession = currentInstance.inputs.obLabelSession ?? true;
      const primaryColor = currentInstance.style.bullishColor || '#2962FF';

      if (showChecklist) {
        return (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold ${
              labelHighlightBg
                ? 'bg-[#131722] border border-[#2962FF] shadow-md'
                : 'bg-transparent text-white'
            }`}
          >
            {showTitle && <span style={{ color: primaryColor }}>+OB</span>}
            {showTitle && <span className="text-zinc-500">|</span>}
            <span className="text-[#00E676]">BOS:✅</span>
            <span className="text-[#00E676]">FVG:✅</span>
            <span className="text-[#00E676]">SWP:✅</span>
            <span className="text-[#00E676]">SESS:✅</span>
            {(showPrice || showSession) && (
              <span className="text-blue-300 ml-1">
                [{[showPrice ? '43210-43250' : null, showSession ? 'London' : null].filter(Boolean).join(' ')}]
              </span>
            )}
          </div>
        );
      } else {
        return (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold ${
              labelHighlightBg
                ? 'bg-[#131722] border border-[#2962FF] shadow-md'
                : 'bg-transparent text-white'
            }`}
          >
            {showTitle && <span style={{ color: primaryColor }}>+OB</span>}
            {showPrice && <span className="text-zinc-300">• 43210-43250</span>}
            {showSession && <span className="text-blue-300">• London</span>}
          </div>
        );
      }
    }

    if (currentInstance.definitionId === 'fvg') {
      const showType = currentInstance.inputs.fvgLabelType ?? true;
      const showPrices = currentInstance.inputs.fvgLabelPrices ?? true;
      const showSize = currentInstance.inputs.fvgLabelSize ?? true;
      const color = currentInstance.style.bullishColor || '#00FF68';

      const parts = [
        showType ? '+FVG' : null,
        showPrices ? '43210.0-43235.0' : null,
        showSize ? '25.0pts' : null,
      ].filter(Boolean);

      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold ${
            labelHighlightBg
              ? 'bg-[#131722] border border-[#00FF68] shadow-md'
              : 'bg-transparent'
          }`}
          style={{ color }}
        >
          {parts.join(' ') || '(Empty label - all tick items off)'}
        </div>
      );
    }

    if (currentInstance.definitionId === 'sessions') {
      const showName = currentInstance.inputs.sessionLabelName ?? true;
      const showHours = currentInstance.inputs.sessionLabelHours ?? true;
      const showHL = currentInstance.inputs.sessionLabelHighLow ?? true;
      const color = currentInstance.style.londonColor || '#00C853';

      const parts = [
        showName ? 'London' : null,
        showHours ? '12:00-16:00' : null,
        showHL ? 'H:43250.0 L:43180.0' : null,
      ].filter(Boolean);

      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold ${
            labelHighlightBg
              ? 'bg-[#131722] border border-[#00C853] shadow-md'
              : 'bg-transparent'
          }`}
          style={{ color }}
        >
          {parts.join(' • ') || '(Empty label - all tick items off)'}
        </div>
      );
    }

    if (currentInstance.definitionId === 'liquidity_zones') {
      const showName = currentInstance.inputs.liqLabelName ?? true;
      const showSweep = currentInstance.inputs.liqLabelSweep ?? true;
      const showPrice = currentInstance.inputs.liqLabelPrice ?? true;
      const showTouches = currentInstance.inputs.liqLabelTouches ?? true;
      const showFromTo = currentInstance.inputs.liqLabelFromTo ?? true;

      let parts: (string | null)[] = [];
      if (showFromTo) {
        const name = showName ? 'PDH ' : '';
        parts = [`${name}SWEEP: $43,250.00 ➔ $43,268.50 (+18.50 pts)`];
      } else {
        parts = [
          showName ? 'PDH' : null,
          showSweep ? '[SWEPT] ✅' : null,
          showPrice ? '$43,250.00' : null,
          showTouches ? '(3x)' : null,
        ];
      }

      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold ${
            labelHighlightBg
              ? 'bg-[#131722] border border-[#FF5252] shadow-md'
              : 'bg-transparent'
          }`}
          style={{ color: '#FF5252' }}
        >
          {parts.filter(Boolean).join(' ') || '(Empty label - all tick items off)'}
        </div>
      );
    }

    if (currentInstance.definitionId === 'volumatic_orb') {
      const showTitle = currentInstance.inputs.orbLabelTitle ?? true;
      const showPrice = currentInstance.inputs.orbLabelPrice ?? true;
      const color = currentInstance.style.rangeColor || '#E040FB';

      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold ${
            labelHighlightBg
              ? 'bg-[#131722] border border-[#E040FB] shadow-md'
              : 'bg-transparent'
          }`}
          style={{ color }}
        >
          {showTitle ? 'ORB High' : ''}
          {showPrice ? ': $43,250.0' : ''}
        </div>
      );
    }

    return (
      <div className="text-xs font-mono text-zinc-300">
        Plot Label: Fast EMA 9: 43,220.50
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2a2e39] flex items-center justify-between bg-[#131722]">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#d1d4dc]">{currentInstance.name}</h2>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#2a2e39] text-zinc-300">
              Settings
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2e39] bg-[#131722] px-5 gap-6 text-sm font-medium">
          {(['Inputs', 'Labels', 'Style', 'Visibility'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 relative transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab ? 'text-[#2962FF] font-bold' : 'text-[#787b86] hover:text-[#d1d4dc]'
              }`}
            >
              {tab === 'Labels' && <Tag className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{tab}</span>
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2962FF]" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[60vh] bg-[#1e222d]">
          
          {/* TAB 1: INPUTS */}
          {activeTab === 'Inputs' && (
            <div className="flex flex-col gap-4">
              {/* Specialized Section for Order Blocks Filters if applicable */}
              {currentInstance.definitionId === 'order_blocks' && (
                <div className="mb-2 p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl flex flex-col gap-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
                    <span className="text-xs font-bold text-[#2962FF] uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚡ SMC Confluence Checklist</span>
                    </span>
                    <span className="text-[10px] text-[#787b86] font-mono">
                      Filter strictly valid institutional OBs
                    </span>
                  </div>

                  <p className="text-[11px] text-[#787b86] leading-relaxed">
                    Check the confluence rules below to show only order blocks that meet your exact execution criteria:
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    {/* Filter 1: Break of Structure (BOS) */}
                    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={Boolean(currentInstance.inputs.filterBreakStructure)}
                        onChange={(e) => handleInputChange('filterBreakStructure', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-[#2962FF] cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                          Break Structure (BOS)
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          Only show OB when aggressive displacement breaks recent swing structure.
                        </span>
                      </div>
                    </label>

                    {/* Filter 2: Form FVG */}
                    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={Boolean(currentInstance.inputs.filterFormFVG)}
                        onChange={(e) => handleInputChange('filterFormFVG', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-[#2962FF] cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                          Form Fair Value Gap (FVG)
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          Only show OB when price leaves an imbalance/FVG during displacement.
                        </span>
                      </div>
                    </label>

                    {/* Filter 3: After Liquidity Sweep */}
                    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={Boolean(currentInstance.inputs.filterAfterSweep)}
                        onChange={(e) => handleInputChange('filterAfterSweep', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-[#2962FF] cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                          After Liquidity Sweep
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          Only show OB when the setup forms after taking/sweeping previous liquidity highs or lows.
                        </span>
                      </div>
                    </label>

                    {/* Filter 4: In Session Only */}
                    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={Boolean(currentInstance.inputs.filterSessionOnly)}
                        onChange={(e) => handleInputChange('filterSessionOnly', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-[#2962FF] cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                          Show in Active Session Only
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          Only show OB formed inside Asia, London, or New York active trading killzones.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Specialized Section for Liquidity Zones Filters */}
              {currentInstance.definitionId === 'liquidity_zones' && (
                <div className="mb-2 p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl flex flex-col gap-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
                    <span className="text-xs font-bold text-[#FF9100] uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚡ Liquidity Selection Checklist</span>
                    </span>
                    <span className="text-[10px] text-[#787b86] font-mono">
                      High-Probability Liquidity Pools
                    </span>
                  </div>

                  <p className="text-[11px] text-[#787b86] leading-relaxed">
                    Filter out random highs and lows. Select which major institutional liquidity pools and trendlines to plot on your chart:
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    {/* Filter 1: Day High & Low */}
                    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={currentInstance.inputs.showDayHighLow ?? true}
                        onChange={(e) => handleInputChange('showDayHighLow', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-[#FF9100] cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                          Day High & Low (PDH / PDL - Extended Until Swept)
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          Extends PDH and PDL lines forward until price sweeps them. Swept levels are permanently marked on the chart with sweep flags.
                        </span>
                      </div>
                    </label>

                    {/* Filter 2: Session High & Low */}
                    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={currentInstance.inputs.showSessionHighLow ?? true}
                        onChange={(e) => handleInputChange('showSessionHighLow', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-[#FF9100] cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                          Previous Session High & Low (Asia / London / NY)
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          Show key liquidity targets from previous completed sessions (P-Asia, P-London, P-NY H/L).
                        </span>
                      </div>
                    </label>

                    {/* Filter 3: Equal Highs & Lows (3+ Touches) */}
                    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={currentInstance.inputs.showThreeTouchEqualHL ?? true}
                        onChange={(e) => handleInputChange('showThreeTouchEqualHL', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-[#FF9100] cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                          Equal Highs & Lows (3+ Touches Only)
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          Only show horizontal equal highs (EQH) and equal lows (EQL) with 3 or more distinct swing touches.
                        </span>
                      </div>
                    </label>

                    {/* Filter 4: Trendline Liquidity (3+ Touches) */}
                    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={currentInstance.inputs.showTrendlineLiquidity ?? true}
                        onChange={(e) => handleInputChange('showTrendlineLiquidity', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-[#FF9100] cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                          Trendline Liquidity (3+ Touches Only)
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          Show descending resistance and ascending support trendlines tested with 3 or more valid touches.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Sweep Extension & Vector Behavior Section */}
                  <div className="mt-3 pt-3 border-t border-[#2a2e39] flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🎯 Sweep Range & Vector Behavior</span>
                      </span>
                      <span className="text-[10px] text-[#787b86] font-mono">
                        From-To Tracking
                      </span>
                    </div>

                    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={Boolean(currentInstance.inputs.extendUntilPrice)}
                        onChange={(e) => handleInputChange('extendUntilPrice', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                          Extend Lines to Current Price (Continuous)
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          {Boolean(currentInstance.inputs.extendUntilPrice)
                            ? 'Lines extend continuously across the chart to current price.'
                            : 'Lines do not extend until price: they stay bounded until price sweeps that level, then show from where to where price swept.'}
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={Boolean(currentInstance.inputs.onlyShowWhenSwept)}
                        onChange={(e) => handleInputChange('onlyShowWhenSwept', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                          Only Show When Price Sweeps Level
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          Hides unswept levels completely and only shows levels once price sweeps them.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={currentInstance.inputs.showSweepVector ?? true}
                        onChange={(e) => handleInputChange('showSweepVector', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                          Show Sweep Vector & Wick Penetration
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          Draws vertical directional arrow and shaded corridor indicating the exact extreme price wicked during the sweep.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Standard inputs or additional parameters */}
              {Object.entries(currentInstance.inputs)
                .filter(([key]) =>
                  !key.startsWith('filter') &&
                  !key.startsWith('show') &&
                  !key.startsWith('fvg') &&
                  !key.startsWith('ob') &&
                  !key.startsWith('session') &&
                  !key.startsWith('liq') &&
                  !key.startsWith('plot') &&
                  !key.startsWith('label')
                )
                .map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-[#d1d4dc] capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    {typeof val === 'number' ? (
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => handleInputChange(key, parseFloat(e.target.value) || 0)}
                        className="w-32 px-3 py-1.5 bg-[#131722] border border-[#2a2e39] rounded-lg text-sm text-[#d1d4dc] text-right font-mono"
                      />
                    ) : typeof val === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) => handleInputChange(key, e.target.checked)}
                        className="w-4 h-4 rounded accent-[#2962FF] cursor-pointer"
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        className="w-32 px-3 py-1.5 bg-[#131722] border border-[#2a2e39] rounded-lg text-sm text-[#d1d4dc] text-right"
                      />
                    )}
                  </div>
                ))}
              {Object.keys(currentInstance.inputs).length === 0 && (
                <p className="text-xs text-[#787b86] italic text-center py-4">No configurable numeric inputs for this indicator.</p>
              )}
            </div>
          )}

          {/* TAB 2: LABELS & TICK LIST HIGHLIGHT */}
          {activeTab === 'Labels' && (
            <div className="flex flex-col gap-4">
              
              {/* Master Labels ON/OFF Toggle Card */}
              <div className="p-4 bg-[#131722] border border-[#2a2e39] rounded-xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h3 className="text-xs font-bold text-[#d1d4dc] uppercase tracking-wider">
                        Chart Label Display
                      </h3>
                      <p className="text-[11px] text-[#787b86]">
                        Show or hide text tags, confluence checklist, and badges on chart
                      </p>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={(e) => handleInputChange('showLabels', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#2a2e39]">
                  <span className="text-[11px] text-[#787b86]">Current Status:</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      showLabels
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700 line-through'
                    }`}
                  >
                    {showLabels ? 'LABELS ON (VISIBLE)' : 'LABELS OFF (HIDDEN)'}
                  </span>
                </div>
              </div>

              {/* Live Highlight Label Preview Box */}
              <div className="p-3.5 bg-[#131722]/80 border border-[#2a2e39] rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Live Highlight Label Preview</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Reflects Tick List Below
                  </span>
                </div>
                
                <div className="min-h-[44px] p-2.5 rounded-lg bg-[#0d1017] border border-zinc-800 flex items-center justify-center overflow-x-auto">
                  {renderPreviewLabel()}
                </div>
              </div>

              {/* Tick List Specific To Indicator */}
              <div className="p-4 bg-[#131722] border border-[#2a2e39] rounded-xl flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-[#d1d4dc] uppercase tracking-wider">
                        Label Content Tick List
                      </h4>
                      <p className="text-[11px] text-[#787b86]">
                        Tick or untick what text to show in the highlight label
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  
                  {/* ORDER BLOCKS TICK LIST */}
                  {currentInstance.definitionId === 'order_blocks' && (
                    <>
                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.showChecklistLabel ?? true}
                          onChange={(e) => handleInputChange('showChecklistLabel', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#00E676] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors flex items-center gap-1.5">
                            <span>SMC Confluence Checklist (✅ / ❌)</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                              BOS • FVG • SWP • SESS
                            </span>
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Displays validation checks (BOS:✅/❌ FVG:✅/❌ SWP:✅/❌ SESS:✅/❌) on the order block.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.obLabelTitle ?? true}
                          onChange={(e) => handleInputChange('obLabelTitle', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#2962FF] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Direction Tag (+OB / -OB)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Include the +OB (Bullish) or -OB (Bearish) order block title tag.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.obLabelPrice ?? true}
                          onChange={(e) => handleInputChange('obLabelPrice', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#2962FF] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Price Range (Top - Bottom Price)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Displays the exact numerical price boundaries of the order block zone.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.obLabelSession ?? true}
                          onChange={(e) => handleInputChange('obLabelSession', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#2962FF] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Session Killzone Tag (Asia / London / NY)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Appends session origin tag when formed inside a specific trading killzone.
                          </span>
                        </div>
                      </label>
                    </>
                  )}

                  {/* FVG TICK LIST */}
                  {currentInstance.definitionId === 'fvg' && (
                    <>
                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.fvgLabelType ?? true}
                          onChange={(e) => handleInputChange('fvgLabelType', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#00FF68] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Gap Direction (+FVG / -FVG)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Displays whether the gap is bullish (+FVG) or bearish (-FVG).
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.fvgLabelPrices ?? true}
                          onChange={(e) => handleInputChange('fvgLabelPrices', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#00FF68] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Price Range (Top - Bottom Price)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Displays the upper and lower boundary prices of the imbalance zone.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.fvgLabelSize ?? true}
                          onChange={(e) => handleInputChange('fvgLabelSize', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#00FF68] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Imbalance Size / Spread (Points)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Displays the exact points size of the price gap.
                          </span>
                        </div>
                      </label>
                    </>
                  )}

                  {/* SESSIONS TICK LIST */}
                  {currentInstance.definitionId === 'sessions' && (
                    <>
                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.sessionLabelName ?? true}
                          onChange={(e) => handleInputChange('sessionLabelName', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#2962FF] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Session Name (Asia / London / New York)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Displays the market center session title on top of each session box.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.sessionLabelHours ?? true}
                          onChange={(e) => handleInputChange('sessionLabelHours', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#2962FF] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Trading Hours (e.g. 06:00 - 10:00 UTC)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Shows operating schedule hours for each killzone.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.sessionLabelHighLow ?? true}
                          onChange={(e) => handleInputChange('sessionLabelHighLow', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#2962FF] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            High & Low Prices (H: ... L: ...)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Displays session highest and lowest prices directly on the badge.
                          </span>
                        </div>
                      </label>
                    </>
                  )}

                  {/* LIQUIDITY ZONES TICK LIST */}
                  {currentInstance.definitionId === 'liquidity_zones' && (
                    <>
                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.liqLabelName ?? true}
                          onChange={(e) => handleInputChange('liqLabelName', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#FF9100] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Pool Identifier (PDH / PDL / Session / EQH / TL)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Shows which liquidity pool or trendline this level belongs to.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.liqLabelSweep ?? true}
                          onChange={(e) => handleInputChange('liqLabelSweep', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#FF9100] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Sweep Status Highlight ([SWEPT] ✅ / [UNSWEPT] ⏳)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Highlights whether price has swept this pool or if it remains active liquidity.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.liqLabelPrice ?? true}
                          onChange={(e) => handleInputChange('liqLabelPrice', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#FF9100] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Exact Numerical Price Level
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Displays the exact dollar price on the liquidity line badge.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.liqLabelTouches ?? true}
                          onChange={(e) => handleInputChange('liqLabelTouches', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#FF9100] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Confirmation Touch Count (e.g. 3+ touches)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Displays how many candle swing touches tested this pool or trendline.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.liqLabelFromTo ?? true}
                          onChange={(e) => handleInputChange('liqLabelFromTo', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-cyan-400 cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            From-To Sweep Price Range Details ($Level ➔ $Extreme)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Displays the exact origin level price to swept wick extreme price with net point difference.
                          </span>
                        </div>
                      </label>
                    </>
                  )}

                  {/* VOLUMATIC ORB TICK LIST */}
                  {currentInstance.definitionId === 'volumatic_orb' && (
                    <>
                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.orbLabelTitle ?? true}
                          onChange={(e) => handleInputChange('orbLabelTitle', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#E040FB] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Opening Range Label Titles (ORB High / Low)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Displays the ORB High and ORB Low titles on chart.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.orbLabelPrice ?? true}
                          onChange={(e) => handleInputChange('orbLabelPrice', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-[#E040FB] cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Exact Boundary Prices ($Price)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Displays the numerical price values next to high and low labels.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentInstance.inputs.showBreakoutSignals ?? true}
                          onChange={(e) => handleInputChange('showBreakoutSignals', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded accent-cyan-400 cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                            Breakout Arrows and Signals (BUY / SELL BREAK)
                          </span>
                          <span className="text-[11px] text-[#787b86]">
                            Draws directional arrows and entry signals on the first candle breakout.
                          </span>
                        </div>
                      </label>
                    </>
                  )}

                  {/* CUSTOM SCRIPT INDICATORS */}
                  {currentInstance.category === 'CUSTOM' && (
                    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={currentInstance.inputs.plotLabelTitle ?? true}
                        onChange={(e) => handleInputChange('plotLabelTitle', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-purple-500 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors">
                          Plot Name and Value Badge
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          Displays the indicator title and live calculated value.
                        </span>
                      </div>
                    </label>
                  )}

                  {/* HIGHLIGHT STYLING OPTION */}
                  <div className="pt-2 mt-1 border-t border-[#2a2e39]/60">
                    <label className="flex items-start gap-3 p-2 rounded-lg bg-[#1e222d]/60 hover:bg-[#1e222d] transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={labelHighlightBg}
                        onChange={(e) => handleInputChange('labelHighlightBg', e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-cyan-500 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#d1d4dc] group-hover:text-white transition-colors flex items-center gap-1.5">
                          <span>High-Contrast Highlight Background Pill</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                            RECOMMENDED
                          </span>
                        </span>
                        <span className="text-[11px] text-[#787b86]">
                          Renders an opaque dark container with a colored border for high readability over candles and wicks.
                        </span>
                      </div>
                    </label>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB 3: STYLE */}
          {activeTab === 'Style' && (
            <div className="flex flex-col gap-4">
              {Object.entries(currentInstance.style).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-[#d1d4dc] capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  {typeof val === 'string' && val.startsWith('#') ? (
                    <input
                      type="color"
                      value={val}
                      onChange={(e) => handleStyleChange(key, e.target.value)}
                      className="w-10 h-7 rounded bg-transparent border border-[#2a2e39] cursor-pointer"
                    />
                  ) : typeof val === 'number' ? (
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => handleStyleChange(key, parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-1.5 bg-[#131722] border border-[#2a2e39] rounded-lg text-sm text-[#d1d4dc] text-right font-mono"
                    />
                  ) : (
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleStyleChange(key, e.target.value)}
                      className="w-32 px-3 py-1.5 bg-[#131722] border border-[#2a2e39] rounded-lg text-sm text-[#d1d4dc] text-right"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: VISIBILITY */}
          {activeTab === 'Visibility' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-[#787b86] uppercase font-bold tracking-wider">Timeframe Visibility</span>
              {['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'].map(tf => {
                const vis = currentInstance.visibility[tf] ?? true;
                return (
                  <label key={tf} className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-sm text-[#d1d4dc] capitalize">{tf}</span>
                    <input
                      type="checkbox"
                      checked={vis}
                      onChange={(e) => handleVisibilityChange(tf, e.target.checked)}
                      className="w-4 h-4 rounded accent-[#2962FF] cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#2a2e39] bg-[#131722] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#2a2e39] hover:bg-[#363c4e] text-[#d1d4dc] text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-[#2962FF] hover:bg-[#1e4bd8] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Apply Changes</span>
          </button>
        </div>

      </div>
    </div>
  );
};
