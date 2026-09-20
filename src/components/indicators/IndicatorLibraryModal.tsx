import React, { useState } from 'react';
import {
  X,
  Search,
  Star,
  Plus,
  Check,
  Sliders,
  Code,
  Eye,
  EyeOff,
  Trash2,
  Play,
  Save,
  FileCode,
  Edit3,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { IndicatorDefinition, IndicatorInstance, IndicatorCategory, SavedCustomScript } from '../../types/indicators';
import { BUILTIN_INDICATORS } from '../../services/indicatorEngine';
import { CandleData } from '../../types/chart';
import { executePineScript, PineScriptResult } from '../../services/pineScriptInterpreter';

interface IndicatorLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeIndicators: IndicatorInstance[];
  onAddIndicator: (def: IndicatorDefinition) => void;
  onRemoveIndicator: (instanceId: string) => void;
  onToggleIndicatorVisibility: (instanceId: string) => void;
  onOpenSettings: (instance: IndicatorInstance) => void;
  candles: CandleData[];
  savedCustomScripts: SavedCustomScript[];
  onSaveCustomScript: (script: SavedCustomScript) => void;
  onDeleteCustomScript: (scriptId: string) => void;
  onRunCustomScript: (script: { name: string; description: string; code: string }) => void;
}

const DEFAULT_SCRIPT_TEMPLATE = `//@version=6
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

// Previous Day / Previous Week High & Low
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

const SCRIPT_PRESETS = [
  {
    name: 'SMC SMC Liquidity & Price-Scale Highlighting',
    code: `//@version=6
indicator("SMC SMC Liquidity & Price-Scale Highlighting", overlay=true)

enableHighlighting  = input.bool(true, "Enable Price-Scale Highlighting", group="General Settings")
showVwap            = input.bool(true, "Show VWAP Markers", group="General Settings")
showLiquidity       = input.bool(true, "Show Liquidity Markers", group="General Settings")
showStructure       = input.bool(true, "Show Market-Structure Markers", group="General Settings")
showObFvg           = input.bool(true, "Show OB/FVG Markers", group="General Settings")
showTp              = input.bool(true, "Show TP Markers", group="General Settings")
showTpLabels        = input.bool(true, "Show Tiny Probability Labels", group="General Settings")

tp1_prob_input      = input.int(85, "TP1 Default Probability (%)", minval=0, maxval=100, group="TP Probabilities")
tp2_prob_input      = input.int(72, "TP2 Default Probability (%)", minval=0, maxval=100, group="TP Probabilities")
tp3_prob_input      = input.int(61, "TP3 Default Probability (%)", minval=0, maxval=100, group="TP Probabilities")
useDynamicProb      = input.bool(true, "Use Dynamic Historical Probabilities", group="TP Probabilities")

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

var float sessionVwap = na
var float vwapUpper = na
var float vwapLower = na

if showVwap
    sessionVwap := ta.vwap
    vwapStDev = ta.stdev(close, 20)
    vwapUpper := sessionVwap + vwapStDev * 1.28
    vwapLower := sessionVwap - vwapStDev * 1.28

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

pdh = request.security(syminfo.tickerid, "D", high[1], barmerge.gaps_off, barmerge.lookahead_on)
pdl = request.security(syminfo.tickerid, "D", low[1], barmerge.gaps_off, barmerge.lookahead_on)
pwh = request.security(syminfo.tickerid, "W", high[1], barmerge.gaps_off, barmerge.lookahead_on)
pwl = request.security(syminfo.tickerid, "W", low[1], barmerge.gaps_off, barmerge.lookahead_on)

var float recentSwingHigh = na
var float recentSwingLow = na
var int trend = 0
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

var float bullishFvgMid = na
var float bearishFvgMid = na

if low[0] > high[2]
    bullishFvgMid := (high[2] + low[0]) / 2.0
if high[0] < low[2]
    bearishFvgMid := (low[2] + high[0]) / 2.0

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

plot(showVwap and enableHighlighting ? sessionVwap : na, "Session VWAP Price Scale", color=vwapColor, display=display.price_scale)
plot(showVwap and enableHighlighting ? vwapUpper : na, "VWAP Upper Band Price Scale", color=vwapColor, display=display.price_scale)
plot(showVwap and enableHighlighting ? vwapLower : na, "VWAP Lower Band Price Scale", color=vwapColor, display=display.price_scale)

plot(showLiquidity and enableHighlighting ? bslPrice : na, "BSL Price Scale", color=bslColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? sslPrice : na, "SSL Price Scale", color=sslColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? eqhPrice : na, "EQH Price Scale", color=eqhColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? eqlPrice : na, "EQL Price Scale", color=eqlColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? pdh : na, "PDH Price Scale", color=pdhColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? pdl : na, "PDL Price Scale", color=pdlColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? pwh : na, "PWH Price Scale", color=pwhColor, display=display.price_scale)
plot(showLiquidity and enableHighlighting ? pwl : na, "PWL Price Scale", color=pwlColor, display=display.price_scale)

plot(showStructure and enableHighlighting ? recentSwingHigh : na, "Recent Swing High Price Scale", color=bosColor, display=display.price_scale)
plot(showStructure and enableHighlighting ? recentSwingLow : na, "Recent Swing Low Price Scale", color=chochColor, display=display.price_scale)
plot(showStructure and enableHighlighting ? bosLevel : na, "BOS Level Price Scale", color=bosColor, display=display.price_scale)
plot(showStructure and enableHighlighting ? chochLevel : na, "CHoCH Level Price Scale", color=chochColor, display=display.price_scale)

plot(showObFvg and enableHighlighting ? bullishOB : na, "Bullish OB Price Scale", color=obBullColor, display=display.price_scale)
plot(showObFvg and enableHighlighting ? bearishOB : na, "Bearish OB Price Scale", color=obBearColor, display=display.price_scale)
plot(showObFvg and enableHighlighting ? bullishFvgMid : na, "Bullish FVG Midpoint Price Scale", color=fvgBullColor, display=display.price_scale)
plot(showObFvg and enableHighlighting ? bearishFvgMid : na, "Bearish FVG Midpoint Price Scale", color=fvgBearColor, display=display.price_scale)

plot(showTp and enableHighlighting ? tp1 : na, "TP1 Price Scale", color=tp1Color, display=display.price_scale)
plot(showTp and enableHighlighting ? tp2 : na, "TP2 Price Scale", color=tp2Color, display=display.price_scale)
plot(showTp and enableHighlighting ? tp3 : na, "TP3 Price Scale", color=tp3Color, display=display.price_scale)
`,
  },
  {
    name: 'Dual EMA Trend (9 & 21)',
    code: `//@version=6
indicator("Dual EMA Trend", overlay=true)

fast = ta.ema(close, 9)
slow = ta.ema(close, 21)

plot(fast, title="Fast EMA 9", color=color.green)
plot(slow, title="Slow EMA 21", color=color.red)
`,
  },
  {
    name: 'SMA 50 & 200 Golden Cross',
    code: `//@version=6
indicator("Golden Cross SMA", overlay=true)

sma50 = ta.sma(close, 50)
sma200 = ta.sma(close, 200)

plot(sma50, title="SMA 50", color=color.yellow)
plot(sma200, title="SMA 200", color=color.blue)
`,
  },
  {
    name: 'RSI Momentum Wave (14)',
    code: `//@version=6
indicator("RSI Momentum Wave", overlay=false)

rsi = ta.rsi(close, 14)

plot(rsi, title="RSI 14", color=color.purple)
`,
  },
];

export const IndicatorLibraryModal: React.FC<IndicatorLibraryModalProps> = ({
  isOpen,
  onClose,
  activeIndicators,
  onAddIndicator,
  onRemoveIndicator,
  onToggleIndicatorVisibility,
  onOpenSettings,
  candles,
  savedCustomScripts,
  onSaveCustomScript,
  onDeleteCustomScript,
  onRunCustomScript,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IndicatorCategory | 'FAVORITES' | 'ACTIVE'>('ACTIVE');
  const [favorites, setFavorites] = useState<string[]>(['sessions', 'volumatic_orb']);

  // Custom Script Editor State
  const [scriptName, setScriptName] = useState('My Custom Script');
  const [scriptDesc, setScriptDesc] = useState('Custom algorithmic indicator script');
  const [scriptCode, setScriptCode] = useState(DEFAULT_SCRIPT_TEMPLATE);
  const [compileResult, setCompileResult] = useState<PineScriptResult | null>(null);
  const [showEditorInline, setShowEditorInline] = useState(false);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleTestCompile = () => {
    const res = executePineScript(scriptCode, candles);
    setCompileResult(res);
    return res;
  };

  const handleRunCurrentScript = () => {
    const res = handleTestCompile();
    if (!res.error) {
      onRunCustomScript({
        name: scriptName.trim() || res.title,
        description: scriptDesc.trim(),
        code: scriptCode,
      });
    }
  };

  const handleSaveCurrentScript = () => {
    const res = handleTestCompile();
    const id = editingScriptId || `custom-script-${Date.now()}`;
    const newSaved: SavedCustomScript = {
      id,
      name: scriptName.trim() || res.title || 'Custom Script',
      description: scriptDesc.trim() || 'Custom user script',
      code: scriptCode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onSaveCustomScript(newSaved);
    setEditingScriptId(id);
  };

  const handleSaveAndRun = () => {
    handleSaveCurrentScript();
    handleRunCurrentScript();
  };

  const handleEditSavedScript = (s: SavedCustomScript) => {
    setEditingScriptId(s.id);
    setScriptName(s.name);
    setScriptDesc(s.description);
    setScriptCode(s.code);
    setShowEditorInline(true);
    setCompileResult(null);
  };

  const categories: { key: IndicatorCategory | 'FAVORITES' | 'ACTIVE'; label: string; count?: number }[] = [
    { key: 'ACTIVE', label: 'Active', count: activeIndicators.length },
    { key: 'CUSTOM', label: 'Custom Scripts', count: savedCustomScripts.length },
    { key: 'VOLUMATIC', label: 'Volumatic' },
    { key: 'SMART_MONEY_CONCEPTS', label: 'Smart Money (SMC)' },
    { key: 'FAVORITES', label: 'Favorites' },
  ];

  const filteredBuiltin = BUILTIN_INDICATORS.filter(ind => {
    const matchesSearch = ind.name.toLowerCase().includes(searchQuery.toLowerCase()) || ind.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedCategory === 'FAVORITES') return favorites.includes(ind.id);
    return ind.category === selectedCategory;
  });

  const filteredSavedCustom = savedCustomScripts.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Header */}
        <div className="px-6 py-3.5 border-b border-[#2a2e39] flex items-center justify-between bg-[#131722]">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-[#d1d4dc] flex items-center gap-2">
              <span>Indicators, Metrics & Custom Strategies</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Top Action Bar */}
        <div className="px-6 py-3 border-b border-[#2a2e39] bg-[#131722] flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[#787b86]" />
            <input
              type="text"
              placeholder="Search active, custom, or built-in indicators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-lg pl-10 pr-4 py-2 text-xs text-[#d1d4dc] placeholder-[#787b86] focus:outline-none focus:border-[#2962FF]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedCategory('CUSTOM');
                setShowEditorInline(true);
                setEditingScriptId(null);
                setScriptName('New Custom Script');
                setScriptDesc('');
                setScriptCode(DEFAULT_SCRIPT_TEMPLATE);
                setCompileResult(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2962FF] hover:bg-[#1e4bd8] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Create Custom Script</span>
            </button>
          </div>
        </div>

        {/* Body: Sidebar + Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 border-r border-[#2a2e39] bg-[#131722] p-3 flex flex-col gap-1 overflow-y-auto shrink-0">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                  selectedCategory === cat.key
                    ? 'bg-[#2962FF]/15 text-[#2962FF] font-bold border-l-4 border-[#2962FF]'
                    : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
                }`}
              >
                <span>{cat.label}</span>
                {cat.count !== undefined && (
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                    selectedCategory === cat.key ? 'bg-[#2962FF] text-white' : 'bg-[#2a2e39] text-[#787b86]'
                  }`}>
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Main Area */}
          <div className="flex-1 p-5 overflow-y-auto bg-[#1e222d] flex flex-col">
            
            {/* 1. ACTIVE SECTION: SHOW ALL ACTIVE INDICATORS WITH ON/OFF TOGGLE */}
            {selectedCategory === 'ACTIVE' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
                  <div>
                    <h3 className="text-sm font-bold text-[#d1d4dc]">Active Indicators ({activeIndicators.length})</h3>
                    <p className="text-xs text-[#787b86]">Manage, toggle ON/OFF, or configure all active default and custom scripts on chart.</p>
                  </div>
                </div>

                {activeIndicators.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-[#787b86] gap-3">
                    <Code className="w-10 h-10 opacity-30" />
                    <p className="text-sm font-medium">No active indicators currently on chart.</p>
                    <p className="text-xs text-[#787b86]">Add indicators from "Smart Money (SMC)" or write one in "Custom Scripts".</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {activeIndicators.map(inst => {
                      const isCustom = inst.category === 'CUSTOM' || inst.definitionId === 'custom_pine';
                      const isVisible = inst.visible && inst.enabled;

                      return (
                        <div
                          key={inst.instanceId}
                          className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                            isVisible
                              ? 'bg-[#131722] border-[#2962FF]/40 shadow-sm'
                              : 'bg-[#131722]/50 border-[#2a2e39] opacity-75'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Visual Status Dot */}
                            <div className={`w-2.5 h-2.5 rounded-full ${isVisible ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'}`} />
                            
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className={`text-sm font-bold ${isVisible ? 'text-white' : 'text-[#787b86] line-through'}`}>
                                  {inst.name}
                                </h4>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                                  isCustom
                                    ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                                    : 'bg-[#2a2e39] text-[#2962FF] border border-[#2962FF]/30'
                                }`}>
                                  {isCustom ? 'Custom Script' : 'SMC'}
                                </span>
                              </div>
                              <p className="text-xs text-[#787b86] mt-0.5">
                                Status: <span className={isVisible ? 'text-emerald-400 font-semibold' : 'text-[#787b86]'}>{isVisible ? 'Active & Visible' : 'Hidden (OFF)'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Control actions: ON/OFF Toggle, Settings, Remove */}
                          <div className="flex items-center gap-2.5">
                            {/* ON / OFF Toggle Switch */}
                            <button
                              onClick={() => onToggleIndicatorVisibility(inst.instanceId)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                isVisible
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                              }`}
                              title={isVisible ? 'Turn OFF' : 'Turn ON'}
                            >
                              {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              <span>{isVisible ? 'ON' : 'OFF'}</span>
                            </button>

                            {/* Settings Button */}
                            <button
                              onClick={() => onOpenSettings(inst)}
                              className="p-2 rounded-lg bg-[#2a2e39] hover:bg-[#363c4e] text-[#d1d4dc] hover:text-white transition-colors cursor-pointer"
                              title="Configure Settings"
                            >
                              <Sliders className="w-4 h-4 text-[#2962FF]" />
                            </button>

                            {/* Remove / Delete Button */}
                            <button
                              onClick={() => onRemoveIndicator(inst.instanceId)}
                              className="p-2 rounded-lg bg-[#2a2e39] hover:bg-rose-900/40 text-[#787b86] hover:text-rose-400 transition-colors cursor-pointer"
                              title="Remove from Chart"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. CUSTOM SECTION: SCRIPT EDITOR, RUNNER, AND SAVED SCRIPTS */}
            {selectedCategory === 'CUSTOM' && (
              <div className="flex flex-col gap-6">
                {/* Header with toggle for Script Editor */}
                <div className="flex items-center justify-between pb-3 border-b border-[#2a2e39]">
                  <div>
                    <h3 className="text-sm font-bold text-[#d1d4dc]">Custom Pine Script™ Engine</h3>
                    <p className="text-xs text-[#787b86]">Put your script, test compile, run directly on chart, and save for repeated use.</p>
                  </div>
                  <button
                    onClick={() => setShowEditorInline(!showEditorInline)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363c4e] text-[#d1d4dc] rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#2962FF]" />
                    <span>{showEditorInline ? 'Hide Editor' : 'Open Script Editor'}</span>
                  </button>
                </div>

                {/* Inline Script Editor & Runner */}
                {showEditorInline && (
                  <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4 flex flex-col gap-4 shadow-lg">
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                      <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                        <input
                          type="text"
                          placeholder="Script Name (e.g. My EMA Trend)"
                          value={scriptName}
                          onChange={(e) => setScriptName(e.target.value)}
                          className="bg-[#1e222d] border border-[#2a2e39] rounded-lg px-3 py-1.5 text-xs text-white font-bold placeholder-[#787b86] focus:outline-none focus:border-[#2962FF] flex-1"
                        />
                        <input
                          type="text"
                          placeholder="Short Description"
                          value={scriptDesc}
                          onChange={(e) => setScriptDesc(e.target.value)}
                          className="bg-[#1e222d] border border-[#2a2e39] rounded-lg px-3 py-1.5 text-xs text-[#d1d4dc] placeholder-[#787b86] focus:outline-none focus:border-[#2962FF] flex-1"
                        />
                      </div>

                      {/* Template Selector Dropdown */}
                      <div className="flex items-center gap-2">
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            const preset = SCRIPT_PRESETS.find(p => p.name === val);
                            if (preset) {
                              setScriptName(preset.name);
                              setScriptCode(preset.code);
                              setCompileResult(null);
                            }
                          }}
                          className="bg-[#1e222d] border border-[#2a2e39] rounded-lg px-2.5 py-1.5 text-xs text-[#787b86] focus:outline-none cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" disabled>Load Example Template...</option>
                          {SCRIPT_PRESETS.map(p => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Script Code Area + Console */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2 flex flex-col border border-[#2a2e39] rounded-lg overflow-hidden bg-[#0d1017]">
                        <div className="px-3 py-1.5 bg-[#1e222d] border-b border-[#2a2e39] text-[11px] font-mono text-[#787b86] flex items-center justify-between">
                          <span>script.pine</span>
                          <span className="text-[10px] text-[#2962FF]">Supported: ta.ema, ta.sma, ta.rsi, plot()</span>
                        </div>
                        <textarea
                          value={scriptCode}
                          onChange={(e) => setScriptCode(e.target.value)}
                          rows={11}
                          className="w-full p-3 bg-transparent text-[#d1d4dc] font-mono text-xs resize-none focus:outline-none leading-relaxed"
                          spellCheck={false}
                        />
                      </div>

                      {/* Compiler / Output Log */}
                      <div className="flex flex-col border border-[#2a2e39] rounded-lg overflow-hidden bg-[#131722]">
                        <div className="px-3 py-1.5 bg-[#1e222d] border-b border-[#2a2e39] text-[11px] font-bold text-[#d1d4dc] flex items-center justify-between">
                          <span>Compiler Console</span>
                          {compileResult && !compileResult.error && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                          {compileResult && compileResult.error && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                        </div>
                        <div className="p-3 font-mono text-[11px] flex-1 overflow-y-auto flex flex-col gap-1 text-[#787b86]">
                          {!compileResult ? (
                            <span className="italic">Click "Run Script" or "Save & Add to Chart" to compile.</span>
                          ) : (
                            compileResult.logs.map((log, i) => (
                              <div key={i} className={log.startsWith('Error') ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                                {log}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: Run, Save, Save & Add */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#2a2e39]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleTestCompile}
                          className="px-3 py-1.5 rounded-lg bg-[#2a2e39] hover:bg-[#363c4e] text-xs font-semibold text-[#d1d4dc] transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Verify Syntax</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveCurrentScript}
                          className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Script</span>
                        </button>

                        <button
                          onClick={handleRunCurrentScript}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Run Script on Chart</span>
                        </button>

                        <button
                          onClick={handleSaveAndRun}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save & Add to Chart</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Saved Custom Scripts List */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#787b86] uppercase tracking-wider">
                      Saved Custom Scripts ({savedCustomScripts.length})
                    </h4>
                  </div>

                  {filteredSavedCustom.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 border border-dashed border-[#2a2e39] rounded-xl text-[#787b86] gap-2">
                      <FileCode className="w-8 h-8 opacity-30" />
                      <p className="text-xs">No custom scripts saved yet.</p>
                      <button
                        onClick={() => setShowEditorInline(true)}
                        className="text-xs text-[#2962FF] hover:underline cursor-pointer"
                      >
                        Create your first script above
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {filteredSavedCustom.map(s => {
                        const isActive = activeIndicators.some(act => act.name === s.name || act.scriptCode === s.code);
                        const activeInst = activeIndicators.find(act => act.name === s.name || act.scriptCode === s.code);

                        return (
                          <div
                            key={s.id}
                            className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                              isActive
                                ? 'bg-purple-950/20 border-purple-700/40'
                                : 'bg-[#131722] border-[#2a2e39] hover:border-[#787b86]'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-purple-900/30 text-purple-400 mt-0.5">
                                <Code className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-[#d1d4dc]">{s.name}</h4>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 font-mono font-bold">
                                    CUSTOM
                                  </span>
                                </div>
                                <p className="text-xs text-[#787b86] mt-0.5">{s.description || 'Custom Pine script'}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Edit Button */}
                              <button
                                onClick={() => handleEditSavedScript(s)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#2a2e39] hover:bg-[#363c4e] text-xs text-[#d1d4dc] transition-colors cursor-pointer flex items-center gap-1"
                                title="Edit in Editor"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#2962FF]" />
                                <span>Edit</span>
                              </button>

                              {/* Run / Add to chart button */}
                              <button
                                onClick={() => {
                                  if (!isActive) {
                                    onRunCustomScript({ name: s.name, description: s.description, code: s.code });
                                  } else if (activeInst) {
                                    onRemoveIndicator(activeInst.instanceId);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                  isActive
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-[#2962FF] hover:bg-[#1e4bd8] text-white'
                                }`}
                              >
                                {isActive ? <Check className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                                <span>{isActive ? 'On Chart' : 'Run on Chart'}</span>
                              </button>

                              {/* Delete saved script */}
                              <button
                                onClick={() => onDeleteCustomScript(s.id)}
                                className="p-2 rounded-lg bg-[#2a2e39] hover:bg-rose-900/30 text-[#787b86] hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete Script"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. BUILTIN SMC, VOLUMATIC & FAVORITES */}
            {(selectedCategory === 'SMART_MONEY_CONCEPTS' || selectedCategory === 'VOLUMATIC' || selectedCategory === 'FAVORITES') && (
              <div className="flex flex-col gap-3">
                <div className="pb-2 border-b border-[#2a2e39]">
                  <h3 className="text-sm font-bold text-[#d1d4dc]">
                    {selectedCategory === 'FAVORITES' ? 'Favorite Indicators' : selectedCategory === 'VOLUMATIC' ? 'Volumatic' : 'Smart Money Concepts (SMC)'}
                  </h3>
                  <p className="text-xs text-[#787b86]">
                    {selectedCategory === 'VOLUMATIC' ? 'Opening range breakout strategy and volumatic indicators.' : 'Institutional trading models, imbalances, and liquidity zones.'}
                  </p>
                </div>

                {filteredBuiltin.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#787b86] gap-2">
                    <Search className="w-8 h-8 opacity-40" />
                    <p className="text-xs">No indicators found in this section.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredBuiltin.map(ind => {
                      const isActive = activeIndicators.some(act => act.definitionId === ind.id);
                      const activeInst = activeIndicators.find(act => act.definitionId === ind.id);
                      const isFav = favorites.includes(ind.id);

                      return (
                        <div
                          key={ind.id}
                          className={`p-4 rounded-xl border transition-all flex items-center justify-between group ${
                            isActive
                              ? 'bg-[#2962FF]/10 border-[#2962FF]/40'
                              : 'bg-[#131722] border-[#2a2e39] hover:border-[#787b86]'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <button
                              onClick={(e) => toggleFavorite(ind.id, e)}
                              className={`p-1 rounded hover:bg-[#2a2e39] transition-colors cursor-pointer ${isFav ? 'text-amber-400' : 'text-[#787b86]'}`}
                              title="Favorite"
                            >
                              <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                            </button>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-[#d1d4dc] group-hover:text-white">{ind.name}</h4>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-[#2a2e39] text-[#787b86] uppercase font-mono">
                                  {ind.category === 'VOLUMATIC' ? 'Volumatic' : 'SMC'}
                                </span>
                              </div>
                              <p className="text-xs text-[#787b86] mt-1">{ind.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isActive && activeInst && (
                              <button
                                onClick={() => onOpenSettings(activeInst)}
                                className="p-2 rounded-lg bg-[#2a2e39] hover:bg-[#363c4e] text-[#d1d4dc] transition-colors cursor-pointer"
                                title="Indicator Settings"
                              >
                                <Sliders className="w-4 h-4 text-[#2962FF]" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (!isActive) {
                                  onAddIndicator(ind);
                                } else if (activeInst) {
                                  onRemoveIndicator(activeInst.instanceId);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-[#2962FF] hover:bg-[#1e4bd8] text-white'
                              }`}
                            >
                              {isActive ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                              <span>{isActive ? 'Added' : 'Add'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
