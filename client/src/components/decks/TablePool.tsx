import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { CardDisplay } from '../common/CardDisplay';
import { Eye, EyeOff, Plus, RotateCcw, Shuffle, ShieldAlert } from 'lucide-react';

export const TablePool: React.FC = () => {
  const { room, cardsMap, activeSet, addDummyToPool, revealPool, resetPool } = useSocket();
  const [dummyDeckId, setDummyDeckId] = useState<string>('');
  const [dummyCount, setDummyCount] = useState<number>(1);
  const [showDummyModal, setShowDummyModal] = useState(false);

  if (!room) return null;

  const pool = room.tablePool;
  const decksList = Object.values(room.decks);

  const handleAddDummy = () => {
    const targetDeckId = dummyDeckId || decksList[0]?.id;
    if (!targetDeckId) return;
    addDummyToPool(targetDeckId, dummyCount);
    setShowDummyModal(false);
  };

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
            <Plus size={14} />
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

      {/* Dummy Modal */}
      {showDummyModal && (
        <div className="mb-4 p-3 bg-slate-800/90 border border-slate-700 rounded-xl">
          <h3 className="text-xs font-bold text-slate-200 mb-2">Draw Dummy / Noise Cards into Pool</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={dummyDeckId || decksList[0]?.id}
              onChange={e => setDummyDeckId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              {decksList.map(d => (
                <option key={d.id} value={d.id}>
                  {d.label} ({d.cardIds.length} left)
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
              <span className="text-xs text-slate-400">Qty:</span>
              <input
                type="number"
                min={1}
                max={20}
                value={dummyCount}
                onChange={e => setDummyCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 bg-transparent text-xs text-white text-center focus:outline-none font-bold"
              />
            </div>

            <button
              onClick={handleAddDummy}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
            >
              Add Face-down
            </button>
            <button
              onClick={() => setShowDummyModal(false)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5"
            >
              Cancel
            </button>
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
              <div key={cardId} className="relative">
                <div className="absolute top-2 right-2 z-10 bg-slate-900/80 text-slate-300 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  #{index + 1}
                </div>
                <CardDisplay card={card} set={activeSet} />
              </div>
            );
          })}
        </div>
      ) : (
        /* Hidden Face-down Cards */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {pool.cards.map((item, idx) => {
            const submitter = item.submittedBy ? room.players[item.submittedBy]?.name : null;
            return (
              <div
                key={item.id}
                className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-inner"
              >
                <div className="w-10 h-10 rounded-full bg-slate-700/60 flex items-center justify-center text-slate-400 mb-2 font-mono font-bold text-sm">
                  #{idx + 1}
                </div>
                <span className="text-xs font-semibold text-slate-200">
                  {item.isDummy ? 'Dummy Card' : `From ${submitter || 'Player'}`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">Face-down</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
