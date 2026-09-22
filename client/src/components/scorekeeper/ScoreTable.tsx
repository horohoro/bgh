import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Plus, Trash2, Edit2, UserPlus, Trophy, Award } from 'lucide-react';

export const ScoreTable: React.FC = () => {
  const {
    room,
    player,
    updateScore,
    addScoreColumn,
    removeScoreColumn,
    renameScoreColumn,
    addScorePlayer,
    removeScorePlayer
  } = useSocket();

  const [editingCell, setEditingCell] = useState<{ playerId: string; columnId: string; playerName: string; colLabel: string; value: number } | null>(null);
  const [newColName, setNewColName] = useState('');
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [renamingLabel, setRenamingLabel] = useState('');

  if (!room) return null;

  const scoreTable = room.scoreTable;
  const columns = scoreTable.columns;

  // Build unified list of players for rows
  const allRowPlayers: { id: string; name: string; color?: string; isGuest?: boolean }[] = [
    ...Object.values(room.players).map(p => ({ id: p.id, name: p.name, color: p.color, isGuest: false })),
    ...scoreTable.customPlayers.map(p => ({ id: p.id, name: p.name, isGuest: true }))
  ];

  // Calculate totals per player
  const playerTotals: Record<string, number> = {};
  let maxTotal = -Infinity;

  for (const p of allRowPlayers) {
    let sum = 0;
    const playerScores = scoreTable.scores[p.id] || {};
    for (const col of columns) {
      sum += (playerScores[col.id] || 0);
    }
    playerTotals[p.id] = sum;
    if (sum > maxTotal) maxTotal = sum;
  }

  const handleCellDelta = (delta: number) => {
    if (!editingCell) return;
    updateScore(editingCell.playerId, editingCell.columnId, delta, false);
    setEditingCell(prev => prev ? { ...prev, value: prev.value + delta } : null);
  };

  const handleCellAbsolute = (val: number) => {
    if (!editingCell) return;
    updateScore(editingCell.playerId, editingCell.columnId, val, true);
    setEditingCell(prev => prev ? { ...prev, value: val } : null);
  };

  const handleAddColumnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addScoreColumn(newColName.trim() || undefined);
    setNewColName('');
    setShowAddColModal(false);
  };

  const handleAddPlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    addScorePlayer(newPlayerName.trim());
    setNewPlayerName('');
    setShowAddPlayerModal(false);
  };

  const handleRenameColSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingColId && renamingLabel.trim()) {
      renameScoreColumn(editingColId, renamingLabel.trim());
      setEditingColId(null);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            Universal Scorekeeper
          </h2>
          <p className="text-[11px] text-slate-400">
            Dynamic 2D scoring matrix for rounds or categories (e.g. 7 Wonders, Flip 7)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Column */}
          <button
            onClick={() => setShowAddColModal(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition active:scale-95"
          >
            <Plus size={14} />
            <span>Add Column</span>
          </button>

          {/* Add Guest Player */}
          <button
            onClick={() => setShowAddPlayerModal(true)}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
          >
            <UserPlus size={14} />
            <span>Add Player</span>
          </button>
        </div>
      </div>

      {/* Score Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/90 text-slate-400 font-semibold border-b border-slate-700/80">
                <th className="py-3 px-3 min-w-[120px] sticky left-0 bg-slate-800 z-10">Player</th>
                {columns.map(col => (
                  <th key={col.id} className="py-3 px-3 min-w-[90px] text-center border-l border-slate-700/50">
                    <div className="flex items-center justify-center gap-1 group">
                      <span className="truncate">{col.label}</span>
                      <button
                        onClick={() => {
                          setEditingColId(col.id);
                          setRenamingLabel(col.label);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-white transition"
                        title="Rename Column"
                      >
                        <Edit2 size={11} />
                      </button>
                      {columns.length > 1 && (
                        <button
                          onClick={() => removeScoreColumn(col.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-400 transition"
                          title="Delete Column"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 min-w-[80px] text-center font-bold text-amber-400 border-l border-slate-700/80 bg-slate-800/90">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {allRowPlayers.map(p => {
                const isMe = p.id === player?.id;
                const total = playerTotals[p.id] || 0;
                const isLeader = total === maxTotal && maxTotal > 0;

                return (
                  <tr key={p.id} className={`hover:bg-slate-800/40 transition ${isMe ? 'bg-slate-800/20' : ''}`}>
                    {/* Player Name Cell */}
                    <td className="py-2.5 px-3 font-semibold text-slate-100 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 flex items-center justify-between gap-2 group">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.color || '#94a3b8' }}
                        />
                        <span className="truncate">{p.name}</span>
                        {isMe && <span className="text-[10px] text-emerald-400 font-bold shrink-0">(You)</span>}
                        {p.isGuest && <span className="text-[10px] text-slate-500 shrink-0">(Guest)</span>}
                      </div>
                      {p.isGuest && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeScorePlayer(p.id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition shrink-0 ml-1"
                          title={`Remove guest ${p.name}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>

                    {/* Column Score Cells */}
                    {columns.map(col => {
                      const val = scoreTable.scores[p.id]?.[col.id] || 0;
                      return (
                        <td
                          key={col.id}
                          onClick={() => {
                            setEditingCell({
                              playerId: p.id,
                              columnId: col.id,
                              playerName: p.name,
                              colLabel: col.label,
                              value: val
                            });
                          }}
                          className="py-2.5 px-3 text-center border-l border-slate-800 cursor-pointer hover:bg-slate-800/80 font-mono font-bold text-slate-200 transition"
                        >
                          {val}
                        </td>
                      );
                    })}

                    {/* Total Cell */}
                    <td className="py-2.5 px-4 text-center font-mono font-black text-sm border-l border-slate-700/80 bg-slate-900">
                      <div className="flex items-center justify-center gap-1">
                        <span className={isLeader ? 'text-amber-400 font-extrabold text-base' : 'text-white'}>
                          {total}
                        </span>
                        {isLeader && <Award size={14} className="text-amber-400 animate-bounce" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Cell Keypad Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xs p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div>
                <span className="text-xs text-slate-400 font-semibold">{editingCell.playerName}</span>
                <h3 className="text-sm font-bold text-white">{editingCell.colLabel}</h3>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Current Value Display */}
            <div className="text-center py-3 bg-slate-800 rounded-xl mb-4">
              <span className="text-3xl font-mono font-black text-emerald-400">{editingCell.value}</span>
            </div>

            {/* Quick Increment Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <button
                onClick={() => handleCellDelta(1)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-lg text-xs"
              >
                +1
              </button>
              <button
                onClick={() => handleCellDelta(5)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-lg text-xs"
              >
                +5
              </button>
              <button
                onClick={() => handleCellDelta(10)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-lg text-xs"
              >
                +10
              </button>
              <button
                onClick={() => handleCellDelta(15)}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-2 rounded-lg text-xs"
              >
                +15
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              <button
                onClick={() => handleCellDelta(-1)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-lg text-xs"
              >
                -1
              </button>
              <button
                onClick={() => handleCellDelta(-5)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-lg text-xs"
              >
                -5
              </button>
              <button
                onClick={() => handleCellDelta(-10)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-lg text-xs"
              >
                -10
              </button>
              <button
                onClick={() => handleCellAbsolute(0)}
                className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-bold py-2 rounded-lg text-xs"
              >
                0
              </button>
            </div>

            {/* Direct Number Input */}
            <div className="flex gap-2">
              <input
                type="number"
                value={editingCell.value}
                onChange={e => handleCellAbsolute(parseInt(e.target.value) || 0)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white text-center focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => setEditingCell(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Column Modal */}
      {showAddColModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddColumnSubmit} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xs p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Add Score Column</h3>
            <p className="text-xs text-slate-400 mb-3">
              e.g. "Round {columns.length + 1}", "Military", "Science", or "Bonus"
            </p>
            <input
              type="text"
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              placeholder={`Round ${columns.length + 1}`}
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white mb-4 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddColModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddPlayerSubmit} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xs p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">Add Guest Player</h3>
            <p className="text-xs text-slate-400 mb-3">Add a player who is playing physically without a phone</p>
            <input
              type="text"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              placeholder="e.g. Charlie"
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white mb-4 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddPlayerModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition"
              >
                Add Player
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Column Modal */}
      {editingColId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleRenameColSubmit} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xs p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Rename Column</h3>
            <input
              type="text"
              value={renamingLabel}
              onChange={e => setRenamingLabel(e.target.value)}
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white mb-4 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingColId(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
