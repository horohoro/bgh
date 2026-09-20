import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Layers, ArrowRight, PlusCircle, LogIn, AlertCircle } from 'lucide-react';

export const JoinRoomModal: React.FC = () => {
  const { createRoom, joinRoom, sets, error, clearError } = useSocket();
  const [tab, setTab] = useState<'join' | 'create'>('join');

  const [playerName, setPlayerName] = useState(() => localStorage.getItem('bga_player_name') || '');
  const [roomCode, setRoomCode] = useState('');
  const [selectedSetId, setSelectedSetId] = useState<string>('fdlm');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    setLoading(true);
    clearError();
    try {
      await joinRoom(roomCode, playerName || 'Player');
    } catch {
      // error is handled in context
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      await createRoom(playerName || 'Host', selectedSetId);
    } catch {
      // error is handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        {/* App Title / Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 mb-3 shadow-inner">
            <Layers size={36} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">BGH <span className="text-emerald-400 font-semibold text-base block sm:inline sm:ml-1">Board Game Helper</span></h1>
          <p className="text-slate-400 text-xs mt-1">Multiplayer companion for cards, scores, dice & turn order</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl mb-5 border border-slate-700/50">
          <button
            type="button"
            onClick={() => { setTab('join'); clearError(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${
              tab === 'join' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn size={15} />
            Join Room
          </button>
          <button
            type="button"
            onClick={() => { setTab('create'); clearError(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${
              tab === 'create' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle size={15} />
            Create Room
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs px-3 py-2.5 rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        {tab === 'join' ? (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="e.g. Alice"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="4-LETTER CODE"
                maxLength={6}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-lg font-mono font-bold tracking-widest text-emerald-400 placeholder-slate-600 uppercase focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-[0.98]"
            >
              <span>{loading ? 'Joining Room...' : 'Enter Game Lobby'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Host Name</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="e.g. Host"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Initial Card Set</label>
              <select
                value={selectedSetId}
                onChange={e => setSelectedSetId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              >
                {sets.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-[0.98]"
            >
              <span>{loading ? 'Creating...' : 'Create New Lobby'}</span>
              <PlusCircle size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
