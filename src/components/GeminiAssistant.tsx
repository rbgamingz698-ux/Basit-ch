import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Sparkles, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface GeminiAssistantProps {
  currentSymbol: string;
  currentTimeframe: string;
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ currentSymbol, currentTimeframe }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: `DEAR PROFESSIONAL TRADER! I am your BT Morgan AI Assistant. I can explore and explain this terminal, analyze ${currentSymbol} ${currentTimeframe} charts, summarize economic events, and help with trading strategies. How can I assist you today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelType, setModelType] = useState<'flash' | 'pro' | 'lite'>('flash');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[Context: Viewing ${currentSymbol} on ${currentTimeframe} timeframe]\n${textToSend}`,
          history: messages,
          modelType: modelType
        })
      });

      if (!response.ok) throw new Error('Failed to communicate with Gemini assistant');
      const data = await response.json();

      setMessages((prev) => [...prev, { role: 'model', text: data.text || 'No response generated.' }]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [...prev, { role: 'model', text: 'Error connecting to Gemini AI assistant. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#2962FF] to-[#1e50e6] text-white shadow-[0_0_25px_rgba(41,98,255,0.4)] border border-[#2962FF]/50 font-bold hover:scale-105 transition-all cursor-pointer group"
          title="Open BT Morgan Gemini Assistant"
        >
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          <span className="text-xs font-mono tracking-wider">BT Morgan AI</span>
        </button>
      ) : (
        <div className="w-[380px] sm:w-[420px] h-[550px] bg-[#131722] border border-[#d4af37]/40 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1e222d] to-[#131722] px-4 py-3 border-b border-[#2a2e39] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#2962FF]/20 border border-[#2962FF]/40 flex items-center justify-center text-amber-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xs tracking-wide">BT Morgan Gemini AI</h3>
                <span className="text-[10px] text-[#787b86]">Exploring Terminal & Markets</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value as any)}
                className="bg-[#1e222d] text-amber-300 border border-[#2a2e39] rounded-lg px-2 py-1 text-[10px] font-mono cursor-pointer outline-none"
              >
                <option value="flash">Flash (General)</option>
                <option value="pro">Pro (Complex Analysis)</option>
                <option value="lite">Lite (Fast)</option>
              </select>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#787b86] hover:text-white p-1 rounded-lg hover:bg-[#2a2e39] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-[#181c27] border-b border-[#2a2e39] flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
            <button
              onClick={() => handleSendMessage(`Analyze current ${currentSymbol} chart and trends on ${currentTimeframe}`)}
              className="px-2.5 py-1 bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#d1d4dc] rounded-md text-[10px] font-mono whitespace-nowrap cursor-pointer transition-colors"
            >
              📊 Analyze {currentSymbol}
            </button>
            <button
              onClick={() => handleSendMessage("What are the upcoming high-impact economic news events this week?")}
              className="px-2.5 py-1 bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#d1d4dc] rounded-md text-[10px] font-mono whitespace-nowrap cursor-pointer transition-colors"
            >
              📰 Economic Calendar
            </button>
            <button
              onClick={() => handleSendMessage("Give me a risk management plan for index day trading")}
              className="px-2.5 py-1 bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#d1d4dc] rounded-md text-[10px] font-mono whitespace-nowrap cursor-pointer transition-colors"
            >
              🛡️ Risk Management
            </button>
          </div>

          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b0d14]">
            {messages.map((m, idx) => (
              <div
                key={`${m.role}-${idx}-${m.text.substring(0, 10)}`}
                className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  m.role === 'user' ? 'bg-[#2962FF] text-white' : 'bg-[#1e222d] border border-[#d4af37]/30 text-amber-300'
                }`}>
                  {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={`max-w-[78%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#2962FF] text-white rounded-tr-xs'
                    : 'bg-[#161a23] border border-[#2a2e39] text-[#d1d4dc] rounded-tl-xs shadow-md font-sans'
                }`}>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-[#787b86] text-xs font-mono p-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2962FF]" />
                <span>BT Morgan AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 bg-[#131722] border-t border-[#2a2e39] flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Ask Gemini about ${currentSymbol}, indicators, news...`}
              className="flex-1 bg-[#1e222d] border border-[#2a2e39] rounded-xl px-3 py-2 text-xs text-white placeholder-[#787b86] focus:outline-none focus:border-[#2962FF] font-mono"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-[#2962FF] hover:bg-[#1e50e6] disabled:opacity-50 text-white transition-all cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
