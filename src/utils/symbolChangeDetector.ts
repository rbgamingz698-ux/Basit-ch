import { useEffect, useRef } from 'react';

/**
 * Custom hook to detect when a symbol changes and trigger a callback
 * e.g., to reset the chart view to the live price.
 */
export function useSymbolChangeDetector(currentSymbol: string, onSymbolChange: () => void) {
  const previousSymbolRef = useRef<string>(currentSymbol);

  useEffect(() => {
    if (previousSymbolRef.current !== currentSymbol) {
      previousSymbolRef.current = currentSymbol;
      onSymbolChange();
    }
  }, [currentSymbol, onSymbolChange]);
}
