import React, { useState, useMemo, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { CardDisplay } from '../common/CardDisplay';
import { DeckSplitControls } from './DeckSplitControls';
import { DeckFilterControls } from './DeckFilterControls';
import { SetFieldDef, Card } from '../../types';
import { Eye, Plus, RotateCcw, Shuffle, X, Layers, Check } from 'lucide-react';

export const TablePool: React.FC = () => {
  const { room, cardsMap, activeSet, addDummyToPool, revealPool, resetPool } = useSocket();
  const [showDummyModal, setShowDummyModal] = useState(false);
  const [dummyCount, setDummyCount] = useState<number>(1);

  // Grouping and filtering state for dummy cards (initialized from room active state)
  const [dummyGroupBy, setDummyGroupBy] = useState<string[]>([]);
  const [dummyFilters, setDummyFilters] = useState<Record<string, string[]>>({});
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');

  const deckedFields = useMemo(() => {
    return activeSet?.fields.filter(f => f.isDecked || f.isFilter) || [];
  }, [activeSet]);

  // Sync initial state when modal opens or room changes
  useEffect(() => {
    if (showDummyModal && room) {
      setDummyGroupBy(room.deckGroupByKeys || []);
      setDummyFilters(room.deckFilters || {});
    }
  }, [showDummyModal, room?.id]);

  if (!room) return null;

  const pool = room.tablePool;

  const allCardsInSet = useMemo(() => {
    return Array.from(cardsMap.values()).filter(
      c => c.setId === (activeSet?.id || room.activeSetId)
    );
  }, [cardsMap, activeSet?.id, room.activeSetId]);

  // Determine cards not yet taken in hand, pool, or discard
  const availableCards = useMemo(() => {
    const takenCardIds = new Set<string>();
    Object.values(room.hands).forEach(h => h.forEach(c => takenCardIds.add(c.cardId)));
    room.discards.forEach(id => takenCardIds.add(id));
    room.tablePool.cards.forEach(c => takenCardIds.add(c.cardId));

    return allCardsInSet.filter(c => !takenCardIds.has(c.id));
  }, [allCardsInSet, room.hands, room.discards, room.tablePool.cards]);

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

  // Dynamically compute refined decks for dummy card selection
  const dummyDecks = useMemo(() => {
    let filtered = availableCards;

    // Apply metadata filters
    if (dummyFilters && Object.keys(dummyFilters).length > 0) {
      filtered = filtered.filter(card => {
        for (const [rawKey, filterVal] of Object.entries(dummyFilters)) {
          if (!filterVal) continue;
          const key = rawKey === 'source' ? 'edition' : rawKey;
          const allowed = (Array.isArray(filterVal) ? filterVal : [filterVal]).map(v => v.toLowerCase());
          if (allowed.length === 0 || allowed.includes('all')) continue;

          let val = card.data[key];
          if (val === undefined || val === null || val === '') {
            if (key === 'edition') val = card.data.source ?? 'Base';
            else if (key === 'source') val = card.data.edition ?? 'Base';
          }
          if (val === undefined || val === null || val === '') return false;
          if (!allowed.includes(String(val).toLowerCase())) return false;
        }
        return true;
      });
    }

    // If no grouping active: single unsplitted deck
    if (dummyGroupBy.length === 0) {
      return [{
        id: 'all',
        label: 'All Available Cards',
        filter: {},
        cardIds: filtered.map(c => c.id)
      }];
    }

    // Partition by dummyGroupBy combination
    const groups = new Map<string, { label: string; filter: Record<string, any>; cardIds: string[] }>();
    for (const card of filtered) {
      const filterObj: Record<string, any> = {};
      const labelParts: string[] = [];

      for (const rawKey of dummyGroupBy) {
        const key = rawKey === 'source' ? 'edition' : rawKey;
        let val = card.data[key];
        if (val === undefined || val === null || val === '') {
          if (key === 'edition') val = card.data.source ?? 'Base';
          else if (key === 'source') val = card.data.edition ?? 'Base';
          else val = 'Standard';
        }
        filterObj[key] = val;
        labelParts.push(String(val));
      }

      const key = labelParts.join('_');
      if (!groups.has(key)) {
        groups.set(key, {
          label: labelParts.join(' | '),
          filter: filterObj,
          cardIds: []
        });
      }
      groups.get(key)!.cardIds.push(card.id);
    }

    return Array.from(groups.entries()).map(([k, g]) => ({
      id: k.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      label: g.label,
      filter: g.filter,
      cardIds: g.cardIds
    }));
  }, [availableCards, dummyGroupBy, dummyFilters]);

  // Default selection: the first of the current splits
  useEffect(() => {
    if (dummyDecks.length > 0) {
      if (!selectedDeckId || !dummyDecks.some(d => d.id === selectedDeckId)) {
        // Pick first non-empty split, or first split
        const firstNonEmpty = dummyDecks.find(d => d.cardIds.length > 0);
        setSelectedDeckId(firstNonEmpty ? firstNonEmpty.id : dummyDecks[0].id);
      }
    } else {
      setSelectedDeckId('');
    }
  }, [dummyDecks, selectedDeckId]);

  const toggleFilterKey = (key: string) => {
    const normalizedKey = key === 'source' ? 'edition' : key;
    setDummyGroupBy(prev =>
      prev.includes(normalizedKey) ? prev.filter(k => k !== normalizedKey) : [...prev, normalizedKey]
    );
  };

  const setFieldFilterToAll = (fieldKey: string) => {
    const normKey = fieldKey === 'source' ? 'edition' : fieldKey;
    setDummyFilters(prev => {
      const next = { ...prev };
      delete next[normKey];
      return next;
    });
  };

  const toggleFilterOption = (fieldKey: string, opt: string, allOptions: string[]) => {
    const normKey = fieldKey === 'source' ? 'edition' : fieldKey;
    const current = (dummyFilters[normKey] || []).map(v => v.toLowerCase());
    const optLower = opt.toLowerCase();

    let nextVals: string[];
    if (current.length === 0 || current.includes('all')) {
      nextVals = [opt];
    } else if (current.includes(optLower)) {
      nextVals = current.filter(v => v !== optLower);
    } else {
      nextVals = [...current, opt];
      if (allOptions.length > 0 && allOptions.every(o => nextVals.includes(o.toLowerCase()))) {
        nextVals = [];
      }
    }

    setDummyFilters(prev => {
      const next = { ...prev };
      if (nextVals.length === 0) {
        delete next[normKey];
      } else {
        next[normKey] = nextVals;
      }
      return next;
    });
  };

  const clearDummyFilters = () => {
    setDummyFilters({});
  };

  const handleAddDummy = () => {
    const targetDeck = dummyDecks.find(d => d.id === selectedDeckId) || dummyDecks[0];
    if (!targetDeck || targetDeck.cardIds.length === 0) return;

    addDummyToPool({
      deckId: targetDeck.id,
      criteria: targetDeck.filter
    }, dummyCount);

    setShowDummyModal(false);
  };

  const selectedDeck = dummyDecks.find(d => d.id === selectedDeckId);
  const maxAvailableInSelected = selectedDeck ? selectedDeck.cardIds.length : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Table Pool</h2>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
              pool.isRevealed
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
            }`}>
              {pool.cards.length} {pool.cards.length === 1 ? 'card' : 'cards'} • {pool.isRevealed ? 'Revealed' : 'Face-down'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Pooled cards for the table guessing/matching phase
          </p>
        </div>

        {/* Pool Controls */}
        <div className="flex items-center gap-2">
          {/* Add Dummy / Noise button */}
          <button
            onClick={() => setShowDummyModal(true)}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-200 transition active:scale-95"
          >
            <Plus size={14} className="text-emerald-400" />
            <span>Add Dummy Cards</span>
          </button>

          {/* Reveal or Hide Pool */}
          {pool.cards.length > 0 && (
            <button
              onClick={() => revealPool()}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-md active:scale-95 ${
                pool.isRevealed
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {pool.isRevealed ? <Shuffle size={14} /> : <Eye size={14} />}
              <span>{pool.isRevealed ? 'Re-shuffle' : 'Reveal All'}</span>
            </button>
          )}

          {/* Reset Pool */}
          {pool.cards.length > 0 && (
            <button
              onClick={() => resetPool(true)}
              className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
              title="Clear Pool for Next Round"
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Refined Dummy Selection Modal */}
      {showDummyModal && (
        <div className="mb-6 p-4 bg-slate-950/90 border border-slate-700 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Layers size={16} className="text-emerald-400" />
                <span>Draw Dummy / Noise Cards into Pool</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Refine available cards with grouping and filters, then select a deck to draw face-down into the pool.
              </p>
            </div>
            <button
              onClick={() => setShowDummyModal(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Reused Grouping & Filter Controls */}
          {deckedFields.length > 0 && (
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
              <DeckSplitControls
                deckedFields={deckedFields}
                currentGroupBy={dummyGroupBy}
                onToggleKey={toggleFilterKey}
                onSelectAll={() => setDummyGroupBy(deckedFields.map(f => f.key))}
                onSingleDeck={() => setDummyGroupBy([])}
                title="Split dummy decks by metadata:"
              />
              <DeckFilterControls
                deckedFields={deckedFields}
                currentFilters={dummyFilters}
                getFieldOptions={getFieldOptions}
                onToggleOption={toggleFilterOption}
                onSetAll={setFieldFilterToAll}
                onClearAll={clearDummyFilters}
                title="Filter dummy cards included in decks:"
              />
            </div>
          )}

          {/* Refined Decks Grid Selection */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 block">
              Select Deck to Draw From:
            </span>
            {dummyDecks.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No cards match the active filters.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {dummyDecks.map(deck => {
                  const isSelected = selectedDeckId === deck.id;
                  const isEmpty = deck.cardIds.length === 0;

                  return (
                    <button
                      key={deck.id}
                      type="button"
                      disabled={isEmpty}
                      onClick={() => setSelectedDeckId(deck.id)}
                      className={`text-left p-3 rounded-xl border transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
                          : isEmpty
                            ? 'bg-slate-900/40 border-slate-800/50 opacity-40 cursor-not-allowed'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white capitalize flex items-center gap-1.5">
                          {isSelected && <Check size={13} className="text-emerald-400 shrink-0" />}
                          <span>{deck.label}</span>
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isEmpty
                            ? 'bg-rose-950/40 text-rose-400'
                            : isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                        }`}>
                          {deck.cardIds.length} left
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quantity & Submit Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Quantity:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setDummyCount(q)}
                    className={`text-xs w-7 h-7 rounded-lg font-bold transition ${
                      dummyCount === q
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={Math.max(1, maxAvailableInSelected)}
                value={dummyCount}
                onChange={e => setDummyCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 bg-slate-900 border border-slate-700 text-xs text-white text-center rounded-lg py-1 font-bold focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDummyModal(false)}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDummy}
                disabled={!selectedDeck || maxAvailableInSelected === 0}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Add {dummyCount} Face-down to Pool</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards Area */}
      {pool.cards.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">No cards in the Table Pool yet.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Players can submit their hand cards here, or you can add dummy cards from any deck.
          </p>
        </div>
      ) : pool.isRevealed ? (
        /* Revealed Face-up Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {pool.revealedOrder.map((cardId, index) => {
            const card = cardsMap.get(cardId);
            if (!card) return null;

            return (
              <div key={cardId} className="relative group">
                <CardDisplay card={card} set={activeSet} />
                <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-[10px] font-mono text-slate-400 border border-slate-700 px-2 py-0.5 rounded-md">
                  #{index + 1}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Face-down Cards in Pool */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {pool.cards.map((pooled, index) => {
            return (
              <div
                key={pooled.id}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-md min-h-[130px] transition hover:border-slate-600"
              >
                <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-400 mb-2">
                  {index + 1}
                </div>
                <span className="text-xs font-bold text-slate-300">
                  {pooled.isDummy ? 'Dummy Card' : 'Player Card'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">
                  Face-down
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
