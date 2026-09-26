import React, { memo } from 'react';

interface TradingViewTimelineWidgetProps {
  symbol?: string;
  height?: string | number;
}

function TradingViewTimelineWidget({ symbol = "CAPITALCOM:US30" }: TradingViewTimelineWidgetProps) {
  const embedUrl = `https://s.tradingview.com/embed-widget/timeline/?displayMode=regular&feedMode=symbol&symbol=${encodeURIComponent(symbol)}&colorTheme=dark&isTransparent=false&locale=en&width=100%&height=100%`;

  return (
    <div className="relative w-full h-full bg-[#131722] overflow-hidden">
      <iframe
        src={embedUrl}
        className="w-full h-full border-0"
        title="TradingView Timeline"
        allow="fullscreen; clipboard-read; clipboard-write"
      />
    </div>
  );
}

export default memo(TradingViewTimelineWidget);
