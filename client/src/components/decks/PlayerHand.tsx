import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { CardDisplay } from '../common/CardDisplay';
import { Eye, EyeOff, Trash2, RotateCcw, Share2 } from 'lucide-react';

export const PlayerHand: React.FC = () => {
  const { room, player, cardsMap, activeSet, discardCard, returnCard, submitToPool } = useSocket();
  const [revealedCardIds, setRevealedCardIds] = useState<Record<string, boolean>>({});

  if (!room || !player) return null;

  const hand = room.hands[player.id] || [];

  const toggleReveal = (cardId: string) => {
    setRevealedCardIds(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white">Your Hand</h2>
          <span className="bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs px-2 py-0.5 rounded-full font-bold">
            {hand.length} {hand.length === 1 ? 'card' : 'cards'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400">Cards are private to you</p>
      </div>

      {hand.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">You don't have any cards in your hand.</p>
          <p className="text-[11px] text-slate-500 mt-1">Tap a deck below to draw a card.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hand.map(item => {
            const card = cardsMap.get(item.cardId);
            if (!card) return null;
            const isRevealed = !!revealedCardIds[item.cardId];

            return (
              <div
                key={item.cardId}
                className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between shadow-md"
              >
                {/* Privacy Shield / Card Face */}
                {isRevealed ? (
                  <div>
                    <CardDisplay card={card} set={activeSet} compact />
                  </div>
                ) : (
                  <div
                    onClick={() => toggleReveal(item.cardId)}
                    className="cursor-pointer bg-slate-900/90 hover:bg-slate-900 border border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center transition group active:scale-[0.99]"
                  >
                    <EyeOff size={28} className="text-slate-400 group-hover:text-emerald-400 transition mb-2" />
                    <span className="text-xs font-bold text-slate-200">Tap to Reveal Card</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Kept hidden from table</span>
                  </div>
                )}

                {/* Card Action Toolbar */}
                <div className="flex items-center justify-between gap-1 pt-3 mt-2 border-t border-slate-700/50 text-xs">
                  {/* Toggle Peek */}
                  <button
                    onClick={() => toggleReveal(item.cardId)}
                    className="flex items-center gap-1 text-slate-300 hover:text-white px-2 py-1 rounded-md hover:bg-slate-700 transition"
                  >
                    {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{isRevealed ? 'Hide' : 'Peek'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Submit to Shared Table Pool (face-down) */}
                    <button
                      onClick={() => submitToPool(item.cardId)}
                      className="flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/30 px-2 py-1 rounded-md transition font-medium text-[11px]"
                      title="Submit to Table Pool face-down"
                    >
                      <Share2 size={13} />
                      <span>To Pool</span>
                    </button>

                    {/* Return to Deck */}
                    <button
                      onClick={() => returnCard(item.cardId)}
                      className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-700 rounded-md transition"
                      title="Return to deck"
                    >
                      <RotateCcw size={14} />
                    </button>

                    {/* Discard */}
                    <button
                      onClick={() => discardCard(item.cardId)}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-md transition"
                      title="Discard card"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
