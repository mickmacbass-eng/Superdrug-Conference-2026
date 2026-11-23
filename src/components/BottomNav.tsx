import React from 'react';
import { LayoutGrid, Clock, MessageSquare } from 'lucide-react';

export type NavTab = 'hub' | 'running-order' | 'interactions';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  savedCount?: number;
  unvotedPollCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  savedCount = 0,
  unvotedPollCount = 0,
}) => {
  const tabs = [
    {
      id: 'hub' as NavTab,
      label: 'Hub',
      icon: LayoutGrid,
    },
    {
      id: 'running-order' as NavTab,
      label: 'Running Order',
      icon: Clock,
      badge: savedCount > 0 ? savedCount : undefined,
    },
    {
      id: 'interactions' as NavTab,
      label: 'Interactions',
      icon: MessageSquare,
      badge: unvotedPollCount > 0 ? 'Live' : undefined,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 pb-safe shadow-lg"
      role="navigation"
      aria-label="Conference Bottom Navigation"
    >
      <div className="max-w-md mx-auto grid grid-cols-3 items-center h-16 px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center h-full w-full py-1 min-h-[44px] transition-colors relative tap-highlight ${
                isActive ? 'text-black font-semibold' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'text-brand scale-110' : 'text-neutral-600'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 text-[9px] font-bold bg-brand text-white px-1.5 py-0.2 rounded-full min-w-4 text-center leading-tight">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-1 tracking-tight leading-none whitespace-nowrap ${
                  isActive ? 'text-black font-bold' : 'text-neutral-500 font-medium'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-5 h-0.5 bg-brand rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
