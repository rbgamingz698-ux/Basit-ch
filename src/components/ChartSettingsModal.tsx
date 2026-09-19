import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ChartSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  onChangeSettings: (settings: any) => void;
}

type Tab = 'Events' | 'Canvas' | 'Symbol' | 'Display';

export const ChartSettingsModal: React.FC<ChartSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChangeSettings,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('Events');
  if (!isOpen) return null;

  const tabs: Tab[] = ['Events', 'Canvas', 'Symbol', 'Display'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-lg shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Chart Settings</h2>
          <button onClick={onClose} className="text-[#787b86] hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-[#2a2e39]">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-2 text-sm font-medium ${activeTab === tab ? 'text-white border-b-2 border-[#2962FF]' : 'text-[#787b86]'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="text-[#d1d4dc] text-sm py-4 h-64 overflow-y-auto space-y-4">
          {activeTab === 'Events' && (
            <>
              {['Ideas', 'Session breaks', 'Economic events'].map(item => (
                <label key={item} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="accent-[#2962FF]" />
                  <span>{item}</span>
                </label>
              ))}
              <div className="pl-8 space-y-4">
                 <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="accent-[#2962FF]" />
                  <span>Only future events</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="accent-[#2962FF]" />
                  <span>Events breaks</span>
                </label>
              </div>
              {['Latest news', 'News notification'].map(item => (
                <label key={item} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="accent-[#2962FF]" />
                  <span>{item}</span>
                </label>
              ))}
            </>
          )}
          {activeTab === 'Canvas' && (
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span>Background</span>
                <select className="bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1">
                  <option>Solid</option>
                </select>
              </label>
              {['Vertical grid lines', 'Horizontal grid lines', 'Crosshair'].map(item => (
                <label key={item} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="accent-[#2962FF]" defaultChecked />
                  <span>{item}</span>
                </label>
              ))}
              <label className="flex items-center justify-between">
                <span>Watermark</span>
                <select className="bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1">
                  <option>Replay mode</option>
                </select>
              </label>
            </div>
          )}
          {activeTab === 'Symbol' && (
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="accent-[#2962FF]" />
                <span>Color bars based on previous close</span>
              </label>
              {['Body', 'Borders', 'Wick'].map(item => (
                <label key={item} className="flex items-center justify-between">
                  <span>{item}</span>
                  <div className="flex gap-2">
                    <input type="checkbox" className="accent-[#2962FF]" defaultChecked />
                    <div className="w-6 h-6 rounded bg-gray-500 border border-gray-400"></div>
                  </div>
                </label>
              ))}
            </div>
          )}
          {activeTab === 'Display' && (
            <div className="space-y-2">
              <p className="font-semibold text-white">Display Specifications</p>
              <p><strong>Screen Size:</strong> 6.6 inches (6.56 inches active area)</p>
              <p><strong>Resolution:</strong> 720 x 1612 pixels (HD+)</p>
              <p><strong>Aspect Ratio:</strong> 20:9</p>
              <p><strong>Refresh Rate:</strong> 90Hz</p>
              <p><strong>Display Type:</strong> IPS LCD</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-[#2a2e39] rounded-lg hover:bg-[#363a45]">
            Cancel
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-[#2962FF] rounded-lg hover:bg-[#1e50e6]">
            Ok
          </button>
        </div>
      </div>
    </div>
  );
};
