import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { CardDisplay } from '../common/CardDisplay';
import { Eye, RotateCcw, Shuffle } from 'lucide-react';

export const TablePool: React.FC = () => {
  const { room, cardsMap, activeSet, revealPool, resetPool } = useSocket();

  if (!room) return null;

  const pool = room.tablePool;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Table Pool</h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                pool.isRevealed
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
              }`}
            >
              {pool.cards.length} {pool.cards.length === 1 ? 'card' : 'cards'} • {pool.isRevealed ? 'Revealed' : 'Face-down'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Pooled cards for the table guessing/matching phase
          </p>
        </div>

        {/* Pool Controls */}
        <div className="flex items-center gap-2">
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

      {/* Cards Area */}
      {pool.cards.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">No cards in the Table Pool yet.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Submit cards from your hand, or tap "+ Dummy" on any deck above to add noise cards.
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
