import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { PlayerHand } from './PlayerHand';
import { TablePool } from './TablePool';
import { Layers, SlidersHorizontal, RotateCcw, Sparkles } from 'lucide-react';

export const DeckExplorer: React.FC = () => {
  const { room, activeSet, configureDecks, drawCards, resetRound } = useSocket();

  if (!room) return null;

  const deckedFields = activeSet?.fields.filter(f => f.isDecked || f.isFilter) || [];
  const currentGroupBy = (room.deckGroupByKeys || []).map(k => k === 'source' ? 'edition' : k);
  const decksList = Object.values(room.decks);

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

        {/* Dynamic Deck Splitting Controls (Decked Metadata) */}
        {deckedFields.length > 0 && (
          <div className="mb-4 p-3 bg-slate-800/70 border border-slate-700/70 rounded-xl">
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
        )}

        {/* Decks Grid */}
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
      </div>

      {/* 3. Shared Table Pool */}
      <TablePool />
    </div>
  );
};
