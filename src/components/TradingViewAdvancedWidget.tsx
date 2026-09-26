import React, { memo } from 'react';

function TradingViewAdvancedWidget() {
  const embedUrl = `https://s.tradingview.com/widgetembed/?symbol=CAPITALCOM%3AUS30&interval=15&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&theme=light&style=1&timezone=Etc%2FUTC&studies=[]&hidevolume=1&compareSymbols=%5B%7B%22symbol%22%3A%22IG%3ANASDAQ%22%2C%22position%22%3A%22NewPane%22%7D%5D&autosize=true&locale=en`;

  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      <iframe
        src={embedUrl}
        className="w-full h-full border-0"
        title="TradingView Advanced Chart - US30"
        allow="fullscreen; clipboard-read; clipboard-write"
      />
    </div>
  );
}

export default memo(TradingViewAdvancedWidget);
