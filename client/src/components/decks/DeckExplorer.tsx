import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { SetFieldDef } from '../../types';
import { PlayerHand } from './PlayerHand';
import { TablePool } from './TablePool';
import { DeckSplitControls } from './DeckSplitControls';
import { DeckFilterControls } from './DeckFilterControls';
import { Layers, RotateCcw, Sparkles, Plus } from 'lucide-react';

export const DeckExplorer: React.FC = () => {
  const { room, activeSet, cardsMap, configureDecks, setDeckFilters, drawCards, addDummyToPool, resetRound } = useSocket();

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
    <div className="space-y-6 pb-28">
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
              className="p-1.5 text-rose-400 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 hover:border-rose-600 rounded-lg transition shadow-sm"
              title="Reshuffle All Cards Back Into Decks"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Dynamic Deck Splitting & Filtering Controls (Decked Metadata) */}
        {deckedFields.length > 0 && (
          <div className="mb-4 p-3 bg-slate-800/70 border border-slate-700/70 rounded-xl space-y-3">
            <DeckSplitControls
              deckedFields={deckedFields}
              currentGroupBy={currentGroupBy}
              onToggleKey={toggleFilterKey}
              onSelectAll={() => configureDecks(deckedFields.map(f => f.key))}
              onSingleDeck={() => configureDecks([])}
            />
            <DeckFilterControls
              deckedFields={deckedFields}
              currentFilters={currentFilters}
              getFieldOptions={getFieldOptions}
              onToggleOption={toggleFilterOption}
              onSetAll={setFieldFilterToAll}
              onClearAll={clearDeckFilters}
            />
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

                  {/* Draw & Dummy Action Buttons */}
                  <div className="pt-2 border-t border-slate-700/50 flex items-center gap-2">
                    <button
                      onClick={() => drawCards(deck.id, 1)}
                      disabled={isEmpty}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
                      title="Draw 1 card into your private hand"
                    >
                      <Sparkles size={14} />
                      <span>{isEmpty ? 'Deck Empty' : 'Draw Card'}</span>
                    </button>
                    <button
                      onClick={() => addDummyToPool(deck.id, 1)}
                      disabled={isEmpty}
                      className="bg-slate-800 hover:bg-slate-700 hover:border-slate-500 border border-slate-700 disabled:opacity-40 text-slate-300 hover:text-white font-semibold py-2.5 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition active:scale-95"
                      title="Draw 1 dummy card directly into Table Pool face-down"
                    >
                      <Plus size={13} className="text-emerald-400" />
                      <span>Dummy</span>
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
