import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { Shuffle, RotateCw, RotateCcw, Crown } from 'lucide-react';

export const TurnOrder: React.FC = () => {
  const { room, player, randomizeOrder } = useSocket();

  if (!room) return null;

  const turnOrder = room.turnOrder;
  const isClockwise = turnOrder.direction === 'clockwise';

  const toggleDirection = () => {
    randomizeOrder(isClockwise ? 'counter-clockwise' : 'clockwise');
  };

  const handleShuffle = () => {
    randomizeOrder(turnOrder.direction);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shuffle size={18} className="text-emerald-400" />
            Player Turn Order
          </h2>
          <p className="text-[11px] text-slate-400">
            Randomized order for all players at the table
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Direction Toggle */}
          <button
            onClick={toggleDirection}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-200 transition"
            title="Toggle Clockwise / Counter-Clockwise"
          >
            {isClockwise ? <RotateCw size={13} className="text-emerald-400" /> : <RotateCcw size={13} className="text-amber-400" />}
            <span className="capitalize">{turnOrder.direction}</span>
          </button>

          {/* Shuffle Button */}
          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition active:scale-95"
          >
            <Shuffle size={14} />
            <span>Shuffle Order</span>
          </button>
        </div>
      </div>

      {/* Ordered Player Sequence */}
      <div className="space-y-2">
        {turnOrder.order.map((pId, idx) => {
          const roomPlayer = room.players[pId];
          const customPlayer = room.scoreTable.customPlayers.find(p => p.id === pId);
          const name = roomPlayer?.name || customPlayer?.name || 'Unknown';
          const color = roomPlayer?.color || '#94a3b8';
          const isFirst = idx === 0;
          const isMe = pId === player?.id;

          return (
            <div
              key={pId}
              className={`flex items-center justify-between p-3 rounded-xl border transition ${
                isFirst
                  ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-md'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Number Badge */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isFirst
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_#10b981]'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  #{idx + 1}
                </div>

                {/* Player Dot & Name */}
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-bold text-sm">{name}</span>
                  {isMe && <span className="text-[10px] text-emerald-400 font-bold">(You)</span>}
                  {customPlayer && <span className="text-[10px] text-slate-500">(Guest)</span>}
                </div>
              </div>

              {/* Status / Crown */}
              {isFirst && (
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-900/50 px-2.5 py-1 rounded-full border border-emerald-500/40">
                  <Crown size={14} className="text-amber-400" />
                  <span>First Player</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
