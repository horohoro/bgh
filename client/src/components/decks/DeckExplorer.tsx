import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { SetFieldDef } from '../../types';
import { PlayerHand } from './PlayerHand';
import { TablePool } from './TablePool';
import { Layers, SlidersHorizontal, RotateCcw, Sparkles, Filter } from 'lucide-react';

export const DeckExplorer: React.FC = () => {
  const { room, activeSet, cardsMap, configureDecks, setDeckFilters, drawCards, resetRound } = useSocket();

  if (!room) return null;

  const deckedFields = activeSet?.fields.filter(f => f.isDecked || f.isFilter) || [];
  const currentGroupBy = (room.deckGroupByKeys || []).map(k => k === 'source' ? 'edition' : k);
  const currentFilters = room.deckFilters || {};
  const decksList = Object.values(room.decks);
  const totalCardsInDecks = decksList.reduce((acc, d) => acc + d.cardIds.length, 0);

  const allCardsInSet = Array.from(cardsMap.values()).filter(
    c => c.setId === (activeSet?.id || room.activeSetId)
  );

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

  const hasActiveDeckFilters = Object.values(currentFilters).some(
    vals => Array.isArray(vals) ? vals.length > 0 && !vals.includes('all') : Boolean(vals && vals !== 'all')
  );

  const toggleFilterKey = (key: string) => {
    const normalizedKey = key === 'source' ? 'edition' : key;
    let nextKeys: string[];
    if (currentGroupBy.includes(normalizedKey)) {
      nextKeys = currentGroupBy.filter(k => k !== normalizedKey);
    } else {
      nextKeys = [...currentGroupBy, normalizedKey];
    }
    configureDecks(nextKeys);
  };

  const setFieldFilterToAll = (fieldKey: string) => {
    const normKey = fieldKey === 'source' ? 'edition' : fieldKey;
    const nextFilters = { ...currentFilters };
    delete nextFilters[normKey];
    setDeckFilters(nextFilters);
  };

  const toggleFilterOption = (fieldKey: string, opt: string, allOptions: string[]) => {
    const normKey = fieldKey === 'source' ? 'edition' : fieldKey;
    const current = (currentFilters[normKey] || []).map(v => v.toLowerCase());
    const optLower = opt.toLowerCase();

    let nextVals: string[];
    if (current.length === 0 || current.includes('all')) {
      // If previously 'all', clicking this option singles it out
      nextVals = [opt];
    } else if (current.includes(optLower)) {
      // If already selected, deselect it
      nextVals = current.filter(v => v !== optLower);
      // If no options left, reset to all
      if (nextVals.length === 0) {
        nextVals = [];
      }
    } else {
      // Add to selection
      nextVals = [...current, opt];
      // If all possible options are now selected, reset to all
      if (allOptions.length > 0 && allOptions.every(o => nextVals.includes(o.toLowerCase()))) {
        nextVals = [];
      }
    }

    const nextFilters = { ...currentFilters };
    if (nextVals.length === 0) {
      delete nextFilters[normKey];
    } else {
      nextFilters[normKey] = nextVals;
    }
    setDeckFilters(nextFilters);
  };

  const clearDeckFilters = () => {
    setDeckFilters({});
  };

  const getDeckBorderClass = (isEmpty: boolean) => {
    if (isEmpty) return 'bg-slate-900/50 border-slate-800/60 opacity-60';
    return 'bg-slate-800/90 border-slate-700 hover:border-slate-600 shadow-md';
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Player's Private Hand */}
      <PlayerHand />

      {/* 2. Decks Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        {/* Decks Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Active Decks</h2>
              <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
                {activeSet?.name || 'Default Set'}
              </span>
              <span className="text-xs text-slate-400">
                ({totalCardsInDecks} cards)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Draw cards directly into your hand from any deck below
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Reset / Reshuffle Decks Button */}
            <button
              onClick={() => {
                if (window.confirm('Reset this round and reshuffle all cards back into the decks?')) {
                  resetRound(true);
                }
              }}
              className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
              title="Reshuffle All Cards Back Into Decks"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Dynamic Deck Splitting & Filtering Controls (Decked Metadata) */}
        {deckedFields.length > 0 && (
          <div className="mb-4 p-3 bg-slate-800/70 border border-slate-700/70 rounded-xl space-y-3">
            {/* Splitting Section */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <SlidersHorizontal size={13} className="text-emerald-400" />
                  <span>Split cards into Decks by metadata:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => configureDecks(deckedFields.map(f => f.key))}
                    className="text-[11px] px-2 py-0.5 rounded-md text-emerald-300 hover:bg-emerald-950/40 border border-emerald-800/40 transition font-medium"
                    title="Enable all metadata splits to get maximum decks"
                  >
                    Select All (Max Split)
                  </button>
                  <button
                    onClick={() => configureDecks([])}
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
                      onClick={() => toggleFilterKey(f.key)}
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

            {/* Filtering Section */}
            <div className="pt-3 border-t border-slate-700/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Filter size={13} className="text-emerald-400" />
                  <span>Filter cards included in decks:</span>
                </span>
                {hasActiveDeckFilters && (
                  <button
                    onClick={clearDeckFilters}
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
                const activeVals = (currentFilters[normKey] || []).map(v => v.toLowerCase());
                const isAll = activeVals.length === 0 || activeVals.includes('all');

                return (
                  <div key={field.key} className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-400 min-w-[90px] shrink-0 flex items-center gap-1">
                      <Filter size={11} className="text-emerald-400" />
                      <span>{field.label}:</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-0.5">
                      <button
                        onClick={() => setFieldFilterToAll(field.key)}
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
                            onClick={() => toggleFilterOption(field.key, opt, options)}
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
          </div>
        )}

        {/* Decks Grid */}
        {decksList.length === 0 || totalCardsInDecks === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
            <p className="text-sm font-semibold text-slate-300">No cards match the active filters</p>
            <p className="text-xs text-slate-500">Try resetting filters or adjusting deck options</p>
            {hasActiveDeckFilters && (
              <button
                onClick={clearDeckFilters}
                className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-md transition mt-2"
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {decksList.map(deck => {
              const isEmpty = deck.cardIds.length === 0;

              return (
                <div
                  key={deck.id}
                  className={`border rounded-xl p-4 flex flex-col justify-between transition ${getDeckBorderClass(isEmpty)}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Layers size={14} className="text-emerald-400" />
                        Deck
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isEmpty
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                            : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                        }`}
                      >
                        {deck.cardIds.length} cards
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white capitalize mb-4 leading-snug">
                      {deck.label}
                    </h3>
                  </div>

                  {/* Draw Button */}
                  <div className="pt-2 border-t border-slate-700/50">
                    <button
                      onClick={() => drawCards(deck.id, 1)}
                      disabled={isEmpty}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
                    >
                      <Sparkles size={14} />
                      <span>{isEmpty ? 'Deck Empty' : 'Draw Card'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Shared Table Pool */}
      <TablePool />
    </div>
  );
};
