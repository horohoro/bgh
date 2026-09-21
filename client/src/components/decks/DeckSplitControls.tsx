import React from 'react';
import { SetFieldDef } from '../../types';
import { SlidersHorizontal } from 'lucide-react';

interface DeckSplitControlsProps {
  deckedFields: SetFieldDef[];
  currentGroupBy: string[];
  onToggleKey: (key: string) => void;
  onSelectAll: () => void;
  onSingleDeck: () => void;
  title?: string;
}

export const DeckSplitControls: React.FC<DeckSplitControlsProps> = ({
  deckedFields,
  currentGroupBy,
  onToggleKey,
  onSelectAll,
  onSingleDeck,
  title = 'Split cards into Decks by metadata:'
}) => {
  if (deckedFields.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <SlidersHorizontal size={13} className="text-emerald-400" />
          <span>{title}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-[11px] px-2 py-0.5 rounded-md text-emerald-300 hover:bg-emerald-950/40 border border-emerald-800/40 transition font-medium"
            title="Enable all metadata splits to get maximum decks"
          >
            Select All (Max Split)
          </button>
          <button
            type="button"
            onClick={onSingleDeck}
            className="text-[11px] px-2 py-0.5 rounded-md text-slate-400 hover:text-rose-300 hover:bg-slate-700 transition"
            title="Combine all cards into a single deck"
          >
            Single Deck
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {deckedFields.map(f => {
          const isActive = currentGroupBy.includes(f.key);
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onToggleKey(f.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/40'
                  : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <span>{isActive ? '✓' : '+'}</span>
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
