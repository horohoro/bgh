import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { Layers, Trophy, Dices, Library } from 'lucide-react';

export type ActiveTab = 'decks' | 'score' | 'tools' | 'library';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { room, player } = useSocket();

  const handCount = player && room?.hands[player.id]?.length || 0;

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'decks', label: 'Decks', icon: <Layers size={20} />, badge: handCount },
    { id: 'score', label: 'Scorekeeper', icon: <Trophy size={20} /> },
    { id: 'tools', label: 'Dice & Order', icon: <Dices size={20} /> },
    { id: 'library', label: 'Cards', icon: <Library size={20} /> }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 pt-1.5 pb-3 shadow-2xl">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition relative active:scale-95 ${
                isActive
                  ? 'text-emerald-400 font-bold bg-slate-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-semibold tracking-tight truncate">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
