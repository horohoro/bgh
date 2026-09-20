import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { CardDisplay } from '../common/CardDisplay';
import { CardFormModal } from './CardFormModal';
import { SetFieldDef } from '../../types/index';
import { Plus, Search, Trash2, Library, BookOpen, RotateCcw, Filter } from 'lucide-react';

export const SetManager: React.FC = () => {
  const { sets, activeSet, cardsMap, refreshSetsAndCards } = useSocket();
  const [selectedSetId, setSelectedSetId] = useState<string>(activeSet?.id || sets[0]?.id || 'fdlm');
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  const currentSet = sets.find(s => s.id === selectedSetId) || activeSet || sets[0];

  // Cards for the selected set
  const allCardsInSet = Array.from(cardsMap.values()).filter(c => c.setId === currentSet?.id);

  // Decked metadata fields (all groupable metadata)
  const deckedFields = currentSet?.fields.filter(f => f.isDecked || f.isFilter) || [];

  const setFilter = (key: string, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({});
    setSearch('');
  };

  const hasActiveFilters = search.trim() !== '' || Object.values(selectedFilters).some(v => v && v !== 'all');

  // Dynamically extract all options for a decked field (from schema options and cards)
  const getFieldOptions = (field: SetFieldDef) => {
    const valuesSet = new Set<string>();
    if (field.options) {
      field.options.forEach(opt => valuesSet.add(opt));
    }
    allCardsInSet.forEach(c => {
      const val = c.data[field.key] ?? (field.key === 'edition' ? c.data.source : undefined);
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        valuesSet.add(String(val));
      }
    });
    return Array.from(valuesSet);
  };

  // Filter cards across search and all decked metadata fields
  const filteredCards = allCardsInSet.filter(c => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const titleObj = c.data.title || c.data.name || c.data.text || '';
      let textToSearch = '';
      if (typeof titleObj === 'string') textToSearch = titleObj;
      else if (typeof titleObj === 'object') textToSearch = Object.values(titleObj).join(' ');
      if (!textToSearch.toLowerCase().includes(q)) return false;
    }

    // Check each decked metadata filter
    for (const field of deckedFields) {
      const activeFilter = selectedFilters[field.key];
      if (activeFilter && activeFilter !== 'all') {
        const cardVal = String(c.data[field.key] ?? (field.key === 'edition' ? c.data.source : ''));
        if (cardVal.toLowerCase() !== activeFilter.toLowerCase()) return false;
      }
    }

    return true;
  });

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm('Delete this card?')) return;
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshSetsAndCards();
      }
    } catch (e) {
      console.error('Failed to delete card:', e);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Library size={18} className="text-emerald-400" />
              Card Set Library
            </h2>
            <p className="text-[11px] text-slate-400">
              Browse, filter, and add cards to your game sets
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Set Dropdown */}
            <select
              value={currentSet?.id}
              onChange={e => {
                setSelectedSetId(e.target.value);
                setSelectedFilters({});
                setSearch('');
              }}
              className="bg-slate-800 border border-slate-700 text-xs text-white font-semibold rounded-lg px-3 py-2 focus:outline-none"
            >
              {sets.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Add Card Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-md transition active:scale-95"
            >
              <Plus size={14} />
              <span>Add Card</span>
            </button>
          </div>
        </div>

        {/* Set Description */}
        {currentSet && (
          <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-start gap-2.5">
            <BookOpen size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-200 block">{currentSet.name}</span>
              <p className="text-[11px] text-slate-400">{currentSet.description}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cards by name, rule, or text..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Decked Metadata Filter Rows (All Groupable Metadata) */}
        {deckedFields.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            {deckedFields.map(field => {
              const options = getFieldOptions(field);
              const currentVal = selectedFilters[field.key] || 'all';

              return (
                <div key={field.key} className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-semibold text-slate-400 min-w-[90px] shrink-0 flex items-center gap-1">
                    <Filter size={11} className="text-emerald-400" />
                    <span>{field.label}:</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-0.5">
                    <button
                      onClick={() => setFilter(field.key, 'all')}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                        currentVal === 'all'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      All
                    </button>
                    {options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFilter(field.key, opt)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize transition whitespace-nowrap ${
                          currentVal.toLowerCase() === opt.toLowerCase()
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cards Grid */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-2">
          <span>Showing {filteredCards.length} of {allCardsInSet.length} cards</span>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {filteredCards.length === 0 ? (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-xs text-slate-400">No cards matched your filter.</p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-2 text-xs text-emerald-400 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredCards.map(card => (
              <div key={card.id} className="relative group">
                <CardDisplay card={card} set={currentSet} />
                <button
                  onClick={() => handleDeleteCard(card.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-slate-900/90 hover:bg-rose-900 border border-slate-700 text-slate-400 hover:text-rose-200 rounded-lg transition"
                  title="Delete card"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Card Modal */}
      {showAddModal && currentSet && (
        <CardFormModal
          set={currentSet}
          onClose={() => setShowAddModal(false)}
          onCardCreated={refreshSetsAndCards}
        />
      )}
    </div>
  );
};
