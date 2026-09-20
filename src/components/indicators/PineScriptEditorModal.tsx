import React, { useState } from 'react';
import { X, Play, Code, CheckCircle, AlertTriangle, Save, Check } from 'lucide-react';
import { CandleData } from '../../types/chart';
import { executePineScript, PineScriptResult } from '../../services/pineScriptInterpreter';
import { SavedCustomScript } from '../../types/indicators';

interface PineScriptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  candles: CandleData[];
  onApplyScriptResult: (result: PineScriptResult) => void;
  onSaveScript?: (script: SavedCustomScript) => void;
}

const DEFAULT_SCRIPT = `//@version=6
indicator("SMC Liquidity & Price-Scale Highlighting", overlay=true)

// ==========================================
// 1. INPUT SETTINGS & TOGGLES
// ==========================================
enableHighlighting  = input.bool(true, "Enable Price-Scale Highlighting", group="General Settings")
showVwap            = input.bool(true, "Show VWAP Markers", group="General Settings")
showLiquidity       = input.bool(true, "Show Liquidity Markers", group="General Settings")
showStructure       = input.bool(true, "Show Market-Structure Markers", group="General Settings")
showObFvg           = input.bool(true, "Show OB/FVG Markers", group="General Settings")
showTp              = input.bool(true, "Show TP Markers", group="General Settings")
showTpLabels        = input.bool(true, "Show Tiny Probability Labels", group="General Settings")

// --- TP CUSTOM PROBABILITIES ---
tp1_prob_input      = input.int(85, "TP1 Default Probability (%)", minval=0, maxval=100, group="TP Probabilities")
tp2_prob_input      = input.int(72, "TP2 Default Probability (%)", minval=0, maxval=100, group="TP Probabilities")
tp3_prob_input      = input.int(61, "TP3 Default Probability (%)", minval=0, maxval=100, group="TP Probabilities")
useDynamicProb      = input.bool(true, "Use Dynamic Historical Probabilities", group="TP Probabilities", tooltip="When enabled, calculates real-time hit rate of target projections based on historical chart swings.")

// ==========================================
// 2. NEON COLOR SYSTEM
// ==========================================
vwapColor     = input.color(#FFFF00, "VWAP Color", group="Colors - VWAP")
bslColor      = input.color(#39FF14, "Buy-Side Liquidity (BSL) Color", group="Colors - Liquidity")
sslColor      = input.color(#FF3131, "Sell-Side Liquidity (SSL) Color", group="Colors - Liquidity")
eqhColor      = input.color(#FF9500, "Equal Highs (EQH) Color", group="Colors - Liquidity")
eqlColor      = input.color(#00A6FF, "Equal Lows (EQL) Color", group="Colors - Liquidity")
pdhColor      = input.color(#39FF14, "Previous Day High (PDH) Color", group="Colors - Liquidity")
pdlColor      = input.color(#FF3131, "Previous Day Low (PDL) Color", group="Colors - Liquidity")
pwhColor      = input.color(#39FF14, "Previous Week High (PWH) Color", group="Colors - Liquidity")
pwlColor      = input.color(#FF3131, "Previous Week Low (PWL) Color", group="Colors - Liquidity")

bosColor      = input.color(#00E5FF, "BOS Color", group="Colors - Market Structure")
chochColor    = input.color(#B026FF, "CHoCH Color", group="Colors - Market Structure")

obBullColor   = input.color(#00E676, "Bullish OB Color", group="Colors - SMC")
obBearColor   = input.color(#FF5252, "Bearish OB Color", group="Colors - SMC")
fvgBullColor  = input.color(#00B0FF, "Bullish FVG Color", group="Colors - SMC")
fvgBearColor  = input.color(#FF007F, "Bearish FVG Color", group="Colors - SMC")

tp1Color      = input.color(#00E5FF, "TP1 Color", group="Colors - Take Profit")
tp2Color      = input.color(#B026FF, "TP2 Color", group="Colors - Take Profit")
tp3Color      = input.color(#39FF14, "TP3 Color", group="Colors - Take Profit")

// ==========================================
// 3. CORE CALCULATIONS
// ==========================================

// A. VWAP CALCULATIONS
var float sessionVwap = na
var float vwapUpper = na
var float vwapLower = na

if showVwap
    sessionVwap := ta.vwap
    vwapStDev = ta.stdev(close, 20)
    vwapUpper := sessionVwap + vwapStDev * 1.28
    vwapLower := sessionVwap - vwapStDev * 1.28

// B. LIQUIDITY CALCULATIONS
var float bslPrice = na
var float sslPrice = na
var float eqhPrice = na
var float eqlPrice = na

ph = ta.pivothigh(high, 5, 5)
pl = ta.pivotlow(low, 5, 5)

if not na(ph)
    bslPrice := ph
if not na(pl)
    sslPrice := pl

// Equal Highs & Equal Lows detection (with 0.08% tolerance threshold)
var float prevPh = na
if not na(ph)
    if not na(prevPh) and math.abs(ph - prevPh) / prevPh < 0.0008
        eqhPrice := math.max(ph, prevPh)
    prevPh := ph

var float prevPl = na
if not na(pl)
    if not na(prevPl) and math.abs(pl - prevPl) / prevPl < 0.0008
        eqlPrice := math.min(pl, prevPl)
    prevPl := pl

// Previous Day / Previous Week High & Low (Fetched securely)
pdh = request.security(syminfo.tickerid, "D", high[1], barmerge.gaps_off, barmerge.lookahead_on)
pdl = request.security(syminfo.tickerid, "D", low[1], barmerge.gaps_off, barmerge.lookahead_on)
pwh = request.security(syminfo.tickerid, "W", high[1], barmerge.gaps_off, barmerge.lookahead_on)
pwl = request.security(syminfo.tickerid, "W", low[1], barmerge.gaps_off, barmerge.lookahead_on)

// C. MARKET STRUCTURE CALCULATIONS (BOS / CHoCH)
var float recentSwingHigh = na
var float recentSwingLow = na
var int trend = 0 // 1 = Bullish, -1 = Bearish
var float bosLevel = na
var float chochLevel = na

if not na(ph)
    recentSwingHigh := ph
if not na(pl)
    recentSwingLow := pl

if close > recentSwingHigh and not na(recentSwingHigh)
    if trend == 1
        bosLevel := recentSwingHigh
    else
        chochLevel := recentSwingHigh
        trend := 1
else if close < recentSwingLow and not na(recentSwingLow)
    if trend == -1
        bosLevel := recentSwingLow
    else
        chochLevel := recentSwingLow
        trend := -1

// D. SMART MONEY CONCEPTS (SMC) CALCULATIONS
atr = ta.atr(14)
isStrongUp = (close > open) and (close - open > 1.2 * atr)
isStrongDown = (close < open) and (open - close > 1.2 * atr)

var float bullishOB = na
var float bearishOB = na

if isStrongUp
    for i = 1 to 5
        if close[i] < open[i]
            bullishOB := close[i]
            break

if isStrongDown
    for i = 1 to 5
        if close[i] > open[i]
            bearishOB := close[i]
            break

// Fair Value Gaps (FVG) Midpoint Calculation
var float bullishFvgMid = na
var float bearishFvgMid = na

if low[0] > high[2]
    bullishFvgMid := (high[2] + low[0]) / 2.0
if high[0] < low[2]
    bearishFvgMid := (low[2] + high[0]) / 2.0

// E. TP LEVELS CALCULATIONS
var float tp1 = na
var float tp2 = na
var float tp3 = na

if trend == 1
    tp1 := recentSwingLow + 1.5 * atr
    tp2 := recentSwingLow + 3.0 * atr
    tp3 := recentSwingLow + 4.5 * atr
else if trend == -1
    tp1 := recentSwingHigh - 1.5 * atr
    tp2 := recentSwingHigh - 3.0 * atr
    tp3 := recentSwingHigh - 4.5 * atr

// F. TP ACTIVE PROBABILITY CALCULATIONS
var int swingCount = 0
var int tp1Hits = 0
var int tp2Hits = 0
var int tp3Hits = 0

var bool tp1Reached = false
var bool tp2Reached = false
var bool tp3Reached = false

if ta.change(recentSwingLow) != 0 or ta.change(recentSwingHigh) != 0
    swingCount += 1
    tp1Reached := false
    tp2Reached := false
    tp3Reached := false

if not na(tp1)
    if trend == 1 and high >= tp1 and not tp1Reached
        tp1Reached := true
        tp1Hits += 1
    else if trend == -1 and low <= tp1 and not tp1Reached
        tp1Reached := true
        tp1Hits += 1

if not na(tp2)
    if trend == 1 and high >= tp2 and not tp2Reached
        tp2Reached := true
        tp2Hits += 1
    else if trend == -1 and low <= tp2 and not tp2Reached
        tp2Reached := true
        tp2Hits += 1

if not na(tp3)
    if trend == 1 and high >= tp3 and not tp3Reached
        tp3Reached := true
        tp3Hits += 1
    else if trend == -1 and low <= tp3 and not tp3Reached
        tp3Reached := true
        tp3Hits += 1

calc_tp1_prob = swingCount > 0 ? math.round((tp1Hits / swingCount) * 100) : tp1_prob_input
calc_tp2_prob = swingCount > 0 ? math.round((tp2Hits / swingCount) * 100) : tp2_prob_input
calc_tp3_prob = swingCount > 0 ? math.round((tp3Hits / swingCount) * 100) : tp3_prob_input

final_tp1_prob = useDynamicProb ? calc_tp1_prob : tp1_prob_input
final_tp2_prob = useDynamicProb ? calc_tp2_prob : tp2_prob_input
final_tp3_prob = useDynamicProb ? calc_tp3_prob : tp3_prob_input

// ==========================================
// 4. PRICE-SCALE HIGHLIGHTING (NO CHART LINES)
// ==========================================
// We plot values with display = display.price_scale so they show up ONLY
// on the right-hand price scale with neon color highlights.

// VWAP markers
plot(showVwap and enableHighlighting ? sessionVwap : na, "Session VWAP Price Scale", color=vwapColor, display=display.price_scale)
plot(showVwap and enableHighlighting ? vwapUpper : na, "VWAP Upper Band Price Scale", color=vwapColor, display=display.price_scale)
plot(showVwap and enableHighlighting ? vwapLower : na, "VWAP Lower Band Price Scale", color=vwapColor, display=display.price_scale)

// Liquidity markers
plot(showLiquidity and enableHighlighting ? bslPrice : na, "BSL Price Scale", color=bslColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? sslPrice : na, "SSL Price Scale", color=sslColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? eqhPrice : na, "EQH Price Scale", color=eqhColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? eqlPrice : na, "EQL Price Scale", color=eqlColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? pdh : na, "PDH Price Scale", color=pdhColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? pdl : na, "PDL Price Scale", color=pdlColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? pwh : na, "PWH Price Scale", color=pwhColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? pwl : na, "PWL Price Scale", color=pwlColor, display=display.price_scale)

// Market Structure markers
plot(showStructure and enableHighlighting ? recentSwingHigh : na, "Recent Swing High Price Scale", color=bosColor, display=display.price_scale)
plot(showStructure and enableHighlighting ? recentSwingLow : na, "Recent Swing Low Price Scale", color=chochColor, display=display.price_scale)
plot(showStructure and enableHighlighting ? bosLevel : na, "BOS Level Price Scale", color=bosColor, display=display.price_scale)
plot(showStructure and enableHighlighting ? chochLevel : na, "CHoCH Level Price Scale", color=chochColor, display=display.price_scale)

// OB & FVG markers
plot(showObFvg and enableHighlighting ? bullishOB : na, "Bullish OB Price Scale", color=obBullColor, display=display.price_scale)
plot(showObFvg and enableHighlighting ? bearishOB : na, "Bearish OB Price Scale", color=obBearColor, display=display.price_scale)
plot(showObFvg and enableHighlighting ? bullishFvgMid : na, "Bullish FVG Midpoint Price Scale", color=fvgBullColor, display=display.price_scale)
plot(showObFvg and enableHighlighting ? bearishFvgMid : na, "Bearish FVG Midpoint Price Scale", color=fvgBearColor, display=display.price_scale)

// TP markers
plot(showTp and enableHighlighting ? tp1 : na, "TP1 Price Scale", color=tp1Color, display=display.price_scale)
plot(showTp and enableHighlighting ? tp2 : na, "TP2 Price Scale", color=tp2Color, display=display.price_scale)
plot(showTp and enableHighlighting ? tp3 : na, "TP3 Price Scale", color=tp3Color, display=display.price_scale)

// ==========================================
// 5. TINY FLOATING PROBABILITY LABELS
// ==========================================
var label tp1Label = na
var label tp2Label = na
var label tp3Label = na

if barstate.islast
    label.delete(tp1Label)
    label.delete(tp2Label)
    label.delete(tp3Label)
    
    if showTpLabels
        if not na(tp1)
            tp1Label := label.new(
                 x = bar_index + 4, 
                 y = tp1, 
                 text = "TP1 · " + str.tostring(final_tp1_prob) + "%", 
                 color = color.new(tp1Color, 100), 
                 textcolor = tp1Color, 
                 style = label.style_label_left, 
                 size = size.tiny
                 )
        if not na(tp2)
            tp2Label := label.new(
                 x = bar_index + 4, 
                 y = tp2, 
                 text = "TP2 · " + str.tostring(final_tp2_prob) + "%", 
                 color = color.new(tp2Color, 100), 
                 textcolor = tp2Color, 
                 style = label.style_label_left, 
                 size = size.tiny
                 )
        if not na(tp3)
            tp3Label := label.new(
                 x = bar_index + 4, 
                 y = tp3, 
                 text = "TP3 · " + str.tostring(final_tp3_prob) + "%", 
                 color = color.new(tp3Color, 100), 
                 textcolor = tp3Color, 
                 style = label.style_label_left, 
                 size = size.tiny
                 )
`;

export const PineScriptEditorModal: React.FC<PineScriptEditorModalProps> = ({
  isOpen,
  onClose,
  candles,
  onApplyScriptResult,
  onSaveScript,
}) => {
  const [scriptCode, setScriptCode] = useState(DEFAULT_SCRIPT);
  const [scriptName, setScriptName] = useState('My Custom Script');
  const [execResult, setExecResult] = useState<PineScriptResult | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleRunScript = () => {
    const res = executePineScript(scriptCode, candles);
    setExecResult(res);
    if (!res.error) {
      onApplyScriptResult(res);
      onClose();
    }
  };

  const handleSaveScript = () => {
    const res = executePineScript(scriptCode, candles);
    setExecResult(res);
    if (onSaveScript) {
      onSaveScript({
        id: `custom-${Date.now()}`,
        name: scriptName.trim() || res.title || 'Custom Script',
        description: 'Saved custom indicator script',
        code: scriptCode,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleSaveAndRun = () => {
    handleSaveScript();
    handleRunScript();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-[#2a2e39] flex items-center justify-between bg-[#131722]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-[#2962FF]/20 text-[#2962FF]">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#d1d4dc]">Pine Script™ Editor & Custom Engine</h2>
              <p className="text-xs text-[#787b86]">Put your script, compile, and run it directly on chart.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveScript}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Saved' : 'Save Script'}</span>
            </button>

            <button
              onClick={handleSaveAndRun}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Save & Add to Chart</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Script Name bar */}
        <div className="px-6 py-2 bg-[#131722] border-b border-[#2a2e39] flex items-center gap-3">
          <span className="text-xs text-[#787b86] font-medium">Script Name:</span>
          <input
            type="text"
            value={scriptName}
            onChange={(e) => setScriptName(e.target.value)}
            className="bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-[#2962FF] w-64"
            placeholder="Script Title"
          />
        </div>

        {/* Code Editor Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0d1017]">
          {/* Main Editor Textarea */}
          <div className="flex-1 flex flex-col border-r border-[#2a2e39]">
            <div className="px-4 py-2 bg-[#131722] border-b border-[#2a2e39] text-xs font-mono text-[#787b86] flex items-center justify-between">
              <span>custom_indicator.pine</span>
              <span className="text-[10px] text-[#2962FF]">v6 Compatible</span>
            </div>
            <textarea
              value={scriptCode}
              onChange={(e) => setScriptCode(e.target.value)}
              className="w-full flex-1 p-4 bg-transparent text-[#d1d4dc] font-mono text-xs resize-none focus:outline-none leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Console / Output Log */}
          <div className="w-full md:w-80 bg-[#131722] flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-[#1e222d] border-b border-[#2a2e39] text-xs font-bold text-[#d1d4dc] flex items-center justify-between">
              <span>Compiler Console</span>
              {execResult && !execResult.error && (
                <div className="flex items-center gap-1 text-emerald-400 text-[10px]">
                  <CheckCircle className="w-3 h-3" />
                  <span>Ready</span>
                </div>
              )}
              {execResult && execResult.error && (
                <div className="flex items-center gap-1 text-rose-400 text-[10px]">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Compile Error</span>
                </div>
              )}
            </div>

            <div className="p-4 font-mono text-xs flex-1 overflow-y-auto flex flex-col gap-1.5 text-[#787b86]">
              {!execResult ? (
                <span className="italic text-[#5d606b]">Click "Save & Add to Chart" to compile and run your script.</span>
              ) : (
                execResult.logs.map((log, i) => (
                  <div key={i} className={log.startsWith('Error') ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
