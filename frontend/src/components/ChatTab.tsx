import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Trophy, Crown, MessageSquare, User, Zap } from 'lucide-react';
import type { ChatMessage } from '../types/clash';
import { sound } from '../utils/audio';
import { useLang } from '../i18n';

interface ChatTabProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({ messages, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useLang();

  const quickPhrases = useMemo(
    () => [t('quick1'), t('quick2'), t('quick3'), t('quick4'), t('quick5')],
    [t]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sound.playClick();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickPhraseClick = (phrase: string) => {
    sound.playClick();
    onSendMessage(phrase);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0D1117] select-none relative">
      {/* Community Online Header */}
      <div className="px-3 py-2 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>{t('communityFeed')}</span>
          </span>
        </div>
        <span className="text-[11px] font-mono text-gray-400">
          {t('chatting', { n: new Set(messages.filter((m) => m.type === 'user').map((m) => m.user)).size })}
        </span>
      </div>

      {/* Messages Feed Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 pb-24">
        {messages.map((msg) => {
          // System & Whale Gold Alerts
          if (msg.type === 'system' || msg.type === 'whale') {
            return (
              <div
                key={msg.id}
                className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/40 rounded-xl p-2.5 text-xs text-amber-200 shadow-xs shadow-amber-500/10 flex items-start gap-2 animate-in fade-in"
              >
                <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 flex-shrink-0 mt-0.5">
                  {msg.type === 'whale' ? (
                    <Crown className="w-3.5 h-3.5 fill-amber-400" />
                  ) : (
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[11px] text-amber-300 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>{msg.type === 'whale' ? t('highRollerAlert') : t('systemNotice')}</span>
                    </span>
                    <span className="text-[10px] text-amber-400/70 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-amber-100 font-medium leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              </div>
            );
          }

          // User Chat Messages
          const isUser = msg.isUser;
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${
                isUser ? 'flex-row-reverse' : ''
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-[#21262D] border border-[#30363D] flex items-center justify-center text-xs flex-shrink-0 text-gray-400">
                <User className="w-3.5 h-3.5" />
              </div>

              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-xs shadow-xs ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-[#161B22] border border-[#30363D] text-gray-200 rounded-tl-xs'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`font-bold text-[11px] ${isUser ? 'text-blue-100' : 'text-amber-400'}`}>
                    {isUser ? t('you') : msg.user}
                  </span>
                  {msg.badge && (
                    <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1 rounded font-mono font-bold">
                      {msg.badge}
                    </span>
                  )}
                  <span className="text-[9px] text-gray-400 font-mono ml-auto">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="leading-snug break-words">{msg.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Chat Input Bar Sitting Directly Above Bottom Tab Bar */}
      <div className="fixed bottom-[56px] left-0 right-0 max-w-md mx-auto bg-[#161B22]/95 backdrop-blur-md border-t border-[#30363D] p-2 z-40">
        {/* Quick Reaction Phrase Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1.5 px-1">
          {quickPhrases.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => handleQuickPhraseClick(phrase)}
              className="text-[11px] font-medium font-mono text-gray-300 px-2 py-0.5 rounded-md bg-[#0D1117] border border-[#30363D] hover:border-gray-500 active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="flex items-center gap-1.5">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('typeMessage')}
            maxLength={140}
            className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-sans"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black p-2 rounded-xl transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};