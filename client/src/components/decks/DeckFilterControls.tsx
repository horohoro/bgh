import React from 'react';
import { SetFieldDef } from '../../types';
import { Filter, RotateCcw } from 'lucide-react';

interface DeckFilterControlsProps {
  deckedFields: SetFieldDef[];
  currentFilters: Record<string, string[] | string>;
  getFieldOptions: (field: SetFieldDef) => string[];
  onToggleOption: (fieldKey: string, opt: string, allOptions: string[]) => void;
  onSetAll: (fieldKey: string) => void;
  onClearAll: () => void;
  title?: string;
}

export const DeckFilterControls: React.FC<DeckFilterControlsProps> = ({
  deckedFields,
  currentFilters,
  getFieldOptions,
  onToggleOption,
  onSetAll,
  onClearAll,
  title = 'Filter cards included in decks:'
}) => {
  if (deckedFields.length === 0) return null;

  const hasActiveDeckFilters = Object.values(currentFilters).some(
    vals => Array.isArray(vals) ? vals.length > 0 && !vals.includes('all') : Boolean(vals && vals !== 'all')
  );

  return (
    <div className="pt-3 border-t border-slate-700/70 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <Filter size={13} className="text-emerald-400" />
          <span>{title}</span>
        </span>
        {hasActiveDeckFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition"
          >
            <RotateCcw size={11} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {deckedFields.map(field => {
        const options = getFieldOptions(field);
        const normKey = field.key === 'source' ? 'edition' : field.key;
        const rawFilter = currentFilters[normKey];
        const activeVals = (Array.isArray(rawFilter) ? rawFilter : (rawFilter ? [rawFilter] : [])).map(v => v.toLowerCase());
        const isAll = activeVals.length === 0 || activeVals.includes('all');

        return (
          <div key={field.key} className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-400 min-w-[90px] shrink-0 flex items-center gap-1">
              <Filter size={11} className="text-emerald-400" />
              <span>{field.label}:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => onSetAll(field.key)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                  isAll
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {options.map(opt => {
                const isSelected = !isAll && activeVals.includes(opt.toLowerCase());
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onToggleOption(field.key, opt, options)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize transition whitespace-nowrap ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
