import React from 'react';
import TradingViewAdvancedWidget from './components/TradingViewAdvancedWidget';
import { AuthProvider } from './components/AuthProvider';

function TerminalApp() {
  return (
    <div className="w-screen h-screen bg-[#131722] overflow-hidden">
      <TradingViewAdvancedWidget />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <TerminalApp />
    </AuthProvider>
  );
}

export default App;
