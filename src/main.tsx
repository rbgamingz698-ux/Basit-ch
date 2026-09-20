import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { SymbolSearchModal } from './components/SymbolSearchModal';
import './index.css';

function StartupScreen() {
  const [showSymbolSearch, setShowSymbolSearch] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('US30');

  if (!showSymbolSearch) {
    return <App />;
  }

  return (
    <div className="min-h-screen bg-[#131722]">
      <SymbolSearchModal
        isOpen={showSymbolSearch}
        onClose={() => setShowSymbolSearch(false)}
        currentSymbol={selectedSymbol}
        onSelectSymbol={(symbol) => {
          setSelectedSymbol(symbol);
          setShowSymbolSearch(false);
        }}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StartupScreen />
  </StrictMode>,
);
