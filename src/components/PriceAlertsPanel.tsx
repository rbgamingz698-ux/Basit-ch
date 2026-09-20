import React, { useState } from 'react';
import { Bell, Plus, X, Trash2 } from 'lucide-react';

interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
}

export const PriceAlertsPanel: React.FC<{ symbol: string; lastPrice: number }> = ({ symbol, lastPrice }) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [targetPrice, setTargetPrice] = useState<string>(lastPrice.toFixed(2));

  const addAlert = () => {
    const price = parseFloat(targetPrice);
    if (!isNaN(price)) {
      setAlerts([...alerts, { id: Date.now().toString(), symbol, targetPrice: price }]);
    }
  };

  const removeAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  return (
    <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" /> Price Alerts
        </h3>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          className="flex-1 bg-[#131722] border border-[#2a2e39] rounded-lg px-3 py-1.5 text-white text-xs"
        />
        <button onClick={addAlert} className="bg-[#2962FF] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      <div className="space-y-2">
        {alerts.map(alert => (
          <div key={alert.id} className="flex items-center justify-between bg-[#131722] p-2 rounded-lg text-xs">
            <span className="text-[#b2b5be] font-bold">{alert.symbol}: <span className="text-white">{alert.targetPrice}</span></span>
            <button onClick={() => removeAlert(alert.id)} className="text-rose-400 hover:text-rose-300">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
