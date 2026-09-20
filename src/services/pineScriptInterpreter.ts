import { CandleData } from '../types/chart';
import { calculateEMA, calculateSMA, calculateRSI } from './indicatorEngine';

export interface PineScriptResult {
  title: string;
  overlay: boolean;
  script: string;
  plots: { label: string; color: string; data: { time: number; value: number }[] }[];
  logs: string[];
  error?: string;
}

export function executePineScript(script: string, candles: CandleData[]): PineScriptResult {
  const logs: string[] = [];
  const plots: { label: string; color: string; data: { time: number; value: number }[] }[] = [];

  try {
    logs.push('Compiling script...');
    let title = 'Custom Pine Script';
    let overlay = true;

    if (!candles || candles.length === 0) {
      logs.push('Warning: No candle data available to execute script.');
      return { title, overlay, script, plots: [], logs };
    }

    const lines = script.split('\n');
    // Symbol table for variables: name -> array of values { time, value }
    const varMap = new Map<string, { time: number; value: number }[]>();
    const numVars = new Map<string, number>();

    // Color mapper helper
    const parseColor = (str: string, fallback: string = '#2962FF'): string => {
      if (/#[0-9a-fA-F]{6}/.test(str)) {
        return str.match(/#[0-9a-fA-F]{6}/)![0];
      }
      if (str.includes('color.blue')) return '#2962FF';
      if (str.includes('color.red')) return '#FF1744';
      if (str.includes('color.green')) return '#00C853';
      if (str.includes('color.yellow')) return '#FFD700';
      if (str.includes('color.orange')) return '#FF9100';
      if (str.includes('color.purple')) return '#AB47BC';
      if (str.includes('color.white')) return '#FFFFFF';
      if (str.includes('color.teal')) return '#00B4D8';
      return fallback;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//')) continue;

      // indicator("...", overlay=true)
      if (line.startsWith('indicator(')) {
        const match = line.match(/indicator\s*\(\s*["']([^"']+)["']/);
        if (match) title = match[1];
        if (line.includes('overlay=false')) overlay = false;
        logs.push(`Loaded script: "${title}" (overlay=${overlay})`);
        continue;
      }

      // Variable = input.int(...) or input(...) or raw numbers
      const inputMatch = line.match(/^([a-zA-Z0-9_]+)\s*=\s*input(?:\.int|\.float)?\s*\(\s*([0-9.]+)/);
      if (inputMatch) {
        const varName = inputMatch[1];
        const val = parseFloat(inputMatch[2]);
        numVars.set(varName, val);
        logs.push(`Input parameter ${varName} = ${val}`);
        continue;
      }

      // Simple numeric assign: len = 14
      const simpleNumMatch = line.match(/^([a-zA-Z0-9_]+)\s*=\s*([0-9]+)\s*$/);
      if (simpleNumMatch) {
        numVars.set(simpleNumMatch[1], parseInt(simpleNumMatch[2], 10));
        continue;
      }

      // ta.ema(close, len)
      const emaMatch = line.match(/(?:([a-zA-Z0-9_]+)\s*=\s*)?ta\.ema\s*\(\s*(?:close|open|high|low)?\s*,\s*([a-zA-Z0-9_]+|[0-9]+)\s*\)/);
      if (emaMatch) {
        const varName = emaMatch[1] || 'ema';
        const lenKey = emaMatch[2];
        const len = numVars.has(lenKey) ? numVars.get(lenKey)! : parseInt(lenKey, 10) || 20;
        const emaData = calculateEMA(candles, len, 'close');
        varMap.set(varName, emaData);
        logs.push(`Calculated ta.ema(length=${len}) -> "${varName}"`);
        continue;
      }

      // ta.sma(close, len)
      const smaMatch = line.match(/(?:([a-zA-Z0-9_]+)\s*=\s*)?ta\.sma\s*\(\s*(?:close|open|high|low)?\s*,\s*([a-zA-Z0-9_]+|[0-9]+)\s*\)/);
      if (smaMatch) {
        const varName = smaMatch[1] || 'sma';
        const lenKey = smaMatch[2];
        const len = numVars.has(lenKey) ? numVars.get(lenKey)! : parseInt(lenKey, 10) || 20;
        const smaData = calculateSMA(candles, len, 'close');
        varMap.set(varName, smaData);
        logs.push(`Calculated ta.sma(length=${len}) -> "${varName}"`);
        continue;
      }

      // ta.rsi(close, len)
      const rsiMatch = line.match(/(?:([a-zA-Z0-9_]+)\s*=\s*)?ta\.rsi\s*\(\s*(?:close|open|high|low)?\s*,\s*([a-zA-Z0-9_]+|[0-9]+)\s*\)/);
      if (rsiMatch) {
        const varName = rsiMatch[1] || 'rsi';
        const lenKey = rsiMatch[2];
        const len = numVars.has(lenKey) ? numVars.get(lenKey)! : parseInt(lenKey, 10) || 14;
        const rsiData = calculateRSI(candles, len);
        varMap.set(varName, rsiData);
        logs.push(`Calculated ta.rsi(length=${len}) -> "${varName}"`);
        continue;
      }

      // plot(...)
      if (line.startsWith('plot(')) {
        // extract variable or series
        const inner = line.substring(5, line.length - 1);
        const parts = inner.split(',');
        const targetVar = parts[0]?.trim();
        const plotColor = parseColor(inner, '#2962FF');
        
        let plotTitle = title;
        const titleMatch = inner.match(/title\s*=\s*["']([^"']+)["']/);
        if (titleMatch) {
          plotTitle = titleMatch[1];
        } else if (targetVar && targetVar !== 'close') {
          plotTitle = `${title} (${targetVar})`;
        }

        if (varMap.has(targetVar)) {
          plots.push({
            label: plotTitle,
            color: plotColor,
            data: varMap.get(targetVar)!
          });
          logs.push(`Plotted series "${targetVar}" with color ${plotColor}`);
        } else if (targetVar === 'close') {
          const closeData = candles.map(c => ({ time: c.time, value: c.close }));
          plots.push({ label: plotTitle, color: plotColor, data: closeData });
          logs.push(`Plotted close price with color ${plotColor}`);
        } else {
          // If not mapped yet, try fallback
          const firstAvailable = Array.from(varMap.values())[0];
          if (firstAvailable) {
            plots.push({ label: plotTitle, color: plotColor, data: firstAvailable });
          } else {
            const fallback = calculateEMA(candles, 20, 'close');
            plots.push({ label: plotTitle, color: plotColor, data: fallback });
          }
        }
      }
    }

    // If no explicit plot() was declared, but ta variables were computed, plot them
    if (plots.length === 0) {
      if (varMap.size > 0) {
        varMap.forEach((data, varName) => {
          plots.push({ label: `${title} (${varName})`, color: '#2962FF', data });
        });
      } else {
        // Fallback default EMA 20
        const defaultData = calculateEMA(candles, 20, 'close');
        plots.push({ label: title, color: '#2962FF', data: defaultData });
      }
    }

    logs.push(`Compiled ${plots.length} plot series successfully.`);
    return { title, overlay, script, plots, logs };
  } catch (err: any) {
    logs.push(`Error: ${err.message}`);
    return { title: 'Error Script', overlay: true, script, plots: [], logs, error: err.message };
  }
}
