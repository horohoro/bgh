import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useFullscreen } from '../../utils/useFullscreen';
import { Copy, Check, Users, LogOut, ChevronDown, X, Maximize, Minimize } from 'lucide-react';

export const LobbyHeader: React.FC = () => {
  const { room, player, connected, sets, activeSet, switchSet, leaveRoom, removePlayer } = useSocket();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [copied, setCopied] = useState(false);
  const [showSetMenu, setShowSetMenu] = useState(false);

  if (!room) return null;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const playersList = Object.values(room.players);

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-md">
      <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
        {/* Top bar: Room Code, Set Selector, and Leave button */}
        <div className="flex items-center justify-between gap-2">
          {/* Room Code Badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition active:scale-95"
              title="Click to copy room code"
            >
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Room:</span>
              <span className="text-base font-extrabold text-emerald-400 tracking-wider font-mono">{room.id}</span>
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
            </button>

            {/* Connection Indicator */}
            <span
              className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`}
              title={connected ? 'Connected' : 'Reconnecting...'}
            />
          </div>

          {/* Active Set Dropdown & Leave */}
          <div className="flex items-center gap-2">
            {/* Set Picker */}
            <div className="relative">
              <button
                onClick={() => setShowSetMenu(!showSetMenu)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-200 transition"
              >
                <span className="truncate max-w-[130px]">{activeSet?.name || 'Select Set'}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showSetMenu && (
                <div className="absolute right-0 mt-1.5 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
                    Switch Card Set
                  </div>
                  {sets.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        switchSet(s.id);
                        setShowSetMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700/80 transition flex items-center justify-between ${
                        s.id === room.activeSetId ? 'text-emerald-400 font-bold bg-slate-700/40' : 'text-slate-200'
                      }`}
                    >
                      <span className="truncate">{s.name}</span>
                      {s.id === room.activeSetId && <Check size={13} className="text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition active:scale-95"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (hide gesture bar & status bar)'}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            {/* Leave Room Button */}
            <button
              onClick={() => {
                if (window.confirm('Leave this game room? You will be removed from the lobby and your cards returned.')) {
                  leaveRoom();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition"
              title="Leave Room"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Players Pill Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold shrink-0 mr-1">
            <Users size={14} />
            <span>{playersList.length}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {playersList.map(p => {
              const isMe = p.id === player?.id;
              const canRemove = player?.isHost || isMe || !p.connected;
              return (
                <div
                  key={p.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 transition ${
                    isMe
                      ? 'bg-slate-800 border-emerald-500/70 text-emerald-300'
                      : 'bg-slate-800/70 border-slate-700 text-slate-300'
                  } ${!p.connected ? 'opacity-50' : ''}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="truncate max-w-[90px]">{p.name}</span>
                  {p.isHost && <span title="Host">👑</span>}
                  {isMe && <span className="text-[10px] text-emerald-400 font-bold">(You)</span>}

                  {canRemove && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Remove "${p.name}" from this game room?`)) {
                          removePlayer(p.id);
                        }
                      }}
                      className="ml-0.5 text-slate-500 hover:text-rose-400 hover:bg-slate-700 p-0.5 rounded transition"
                      title={`Remove ${p.name}`}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
