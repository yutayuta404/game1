import { Gamepad2, MessageSquare, User } from 'lucide-react';
import type { TabType } from '../types/clash';
import { sound } from '../utils/audio';
import { hapticLight } from '../utils/telegram';
import { useLang } from '../i18n';

interface BottomTabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeBetsCount: number;
  unreadChatCount?: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
  unreadChatCount = 0,
}) => {
  const { t } = useLang();
  const tabs: Array<{ id: TabType; label: string; icon: typeof Gamepad2; badge?: number }> = [
    {
      id: 'game',
      label: t('tabGame'),
      icon: Gamepad2,
    },
    {
      id: 'chat',
      label: t('tabChat'),
      icon: MessageSquare,
      badge: unreadChatCount > 0 ? unreadChatCount : undefined,
    },
    {
      id: 'profile',
      label: t('tabProfile'),
      icon: User,
    },
  ];

  return (
    <nav
      id="bottom-nav-bar"
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#161B22]/95 backdrop-blur-md border-t border-white/10 flex justify-around py-2.5 px-3 z-50 select-none shadow-2xl shadow-black/80"
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id}`}
            onClick={() => {
              sound.playClick();
              hapticLight();
              onTabChange(tab.id);
            }}
            className={`relative flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer ${
              isActive
                ? 'text-amber-400 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {/* Active Pill Indicator — kept mounted for smooth transitions */}
            <span
              className={`absolute -top-2.5 w-8 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full shadow-sm shadow-amber-500/50 transition-all duration-200 ${
                isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
              }`}
            />

            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform duration-150 ${
                  isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.75]'
                }`}
              />

              {/* Badge Counter */}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center leading-tight ring-2 ring-[#161B22] animate-pulse">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>

            <span className="text-[11px] mt-1 tracking-tight">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};