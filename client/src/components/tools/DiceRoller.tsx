import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Dices, Plus, Minus, History, Sparkles } from 'lucide-react';

const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100];

export const DiceRoller: React.FC = () => {
  const { room, rollDice, recentRoll } = useSocket();

  const [counts, setCounts] = useState<Record<number, number>>({ 6: 1 });
  const [modifier, setModifier] = useState<number>(0);
  const [rolling, setRolling] = useState(false);

  const setDieCount = (sides: number, count: number) => {
    setCounts(prev => ({
      ...prev,
      [sides]: Math.max(0, Math.min(20, count))
    }));
  };

  const handleRoll = async () => {
    const dice = Object.entries(counts)
      .map(([s, c]) => ({ sides: parseInt(s), count: c }))
      .filter(d => d.count > 0);

    if (dice.length === 0) return;

    setRolling(true);
    try {
      await rollDice(dice, modifier);
    } finally {
      setTimeout(() => setRolling(false), 400);
    }
  };

  const totalDiceSelected = Object.values(counts).reduce((a, b) => a + b, 0);
  const diceHistory = room?.diceHistory || [];

  return (
    <div className="space-y-4">
      {/* Dice Selection Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Dices size={18} className="text-emerald-400" />
              Dice Roller
            </h2>
            <p className="text-[11px] text-slate-400">
              Synchronized tabletop dice rolling for all players
            </p>
          </div>

          {/* Clear Button */}
          {totalDiceSelected > 0 && (
            <button
              onClick={() => { setCounts({}); setModifier(0); }}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Die Type Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {DIE_SIDES.map(sides => {
            const count = counts[sides] || 0;
            return (
              <div
                key={sides}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-between gap-2 transition ${
                  count > 0
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-white'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <span className="font-mono font-black text-sm text-emerald-400">d{sides}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDieCount(sides, count - 1)}
                    disabled={count === 0}
                    className="w-6 h-6 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center text-xs text-white"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-5 text-center font-bold text-xs">{count}</span>
                  <button
                    onClick={() => setDieCount(sides, count + 1)}
                    className="w-6 h-6 rounded-md bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xs text-white"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Modifier Box */}
          <div className="p-2.5 rounded-xl border border-slate-700/80 bg-slate-800/80 flex flex-col items-center justify-between gap-2">
            <span className="font-mono font-bold text-xs text-slate-300">Modifier</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setModifier(m => m - 1)}
                className="w-6 h-6 rounded-md bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xs text-white"
              >
                <Minus size={12} />
              </button>
              <span className="w-6 text-center font-bold text-xs">{modifier >= 0 ? `+${modifier}` : modifier}</span>
              <button
                onClick={() => setModifier(m => m + 1)}
                className="w-6 h-6 rounded-md bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xs text-white"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Roll Button */}
        <button
          onClick={handleRoll}
          disabled={totalDiceSelected === 0 || rolling}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-[0.98]"
        >
          <Sparkles size={16} className={rolling ? 'animate-spin' : ''} />
          <span>{rolling ? 'Rolling...' : `Roll ${totalDiceSelected} Dice`}</span>
        </button>

        {/* Most Recent Result Banner */}
        {recentRoll && (
          <div className="bg-slate-800/90 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">
                {recentRoll.playerName} rolled:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {recentRoll.rolls.map((r, i) => (
                  <span
                    key={i}
                    className="w-6 h-6 rounded bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-emerald-300"
                  >
                    {r}
                  </span>
                ))}
                {recentRoll.modifier !== 0 && (
                  <span className="text-xs text-slate-400 font-mono">
                    {recentRoll.modifier > 0 ? `+${recentRoll.modifier}` : recentRoll.modifier}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Total</span>
              <span className="text-2xl font-mono font-black text-emerald-400">{recentRoll.total}</span>
            </div>
          </div>
        )}
      </div>

      {/* Room Roll History Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
          <History size={14} />
          Room Roll History
        </h3>

        {diceHistory.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No dice rolled yet in this room.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {diceHistory.map(entry => {
              const diceDesc = entry.dice.map(d => `${d.count}d${d.sides}`).join(' + ');
              const timeStr = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div
                  key={entry.id}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{entry.playerName}</span>
                    <span className="text-slate-400 text-[11px] font-mono">
                      {diceDesc} {entry.modifier !== 0 ? (entry.modifier > 0 ? `+${entry.modifier}` : entry.modifier) : ''}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">[{entry.rolls.join(', ')}]</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-emerald-400 text-sm">{entry.total}</span>
                    <span className="text-[10px] text-slate-500">{timeStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
