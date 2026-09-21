import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoomState, Player, CardSet, Card, DiceDie, DiceRollResult } from '../types/index';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  room: RoomState | null;
  player: Player | null;
  sets: CardSet[];
  activeSet: CardSet | null;
  cardsMap: Map<string, Card>;
  recentRoll: DiceRollResult | null;
  error: string | null;
  clearError: () => void;
  // Room Actions
  createRoom: (hostName: string, preferredSetId?: string) => Promise<void>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  leaveRoom: () => void;
  removePlayer: (playerId: string) => Promise<void>;
  // Set & Deck Actions
  switchSet: (setId: string) => Promise<void>;
  configureDecks: (groupByKeys?: string[], filters?: Record<string, string[]>) => Promise<void>;
  setDeckFilters: (filters: Record<string, string[]>) => Promise<void>;
  drawCards: (deckId: string, count?: number) => Promise<void>;
  discardCard: (cardId: string) => Promise<void>;
  returnCard: (cardId: string, targetDeckId?: string) => Promise<void>;
  // Table Pool Actions
  submitToPool: (cardId: string) => Promise<void>;
  addDummyToPool: (deckId: string, count?: number) => Promise<void>;
  revealPool: () => Promise<void>;
  resetPool: (discard?: boolean) => Promise<void>;
  resetRound: (reshuffleDecks?: boolean) => Promise<void>;
  // Score Matrix Actions
  updateScore: (playerId: string, columnId: string, deltaOrValue: number, isAbsolute?: boolean) => Promise<void>;
  addScoreColumn: (label?: string) => Promise<void>;
  removeScoreColumn: (columnId: string) => Promise<void>;
  renameScoreColumn: (columnId: string, label: string) => Promise<void>;
  addScorePlayer: (name: string) => Promise<void>;
  removeScorePlayer: (playerId: string) => Promise<void>;
  // Tools
  randomizeOrder: (direction?: 'clockwise' | 'counter-clockwise') => Promise<void>;
  rollDice: (dice: DiceDie[], modifier?: number) => Promise<void>;
  refreshSetsAndCards: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [sets, setSets] = useState<CardSet[]>([]);
  const [cardsMap, setCardsMap] = useState<Map<string, Card>>(new Map());
  const [recentRoll, setRecentRoll] = useState<DiceRollResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Fetch Sets and all cards
  const refreshSetsAndCards = useCallback(async () => {
    try {
      const setsRes = await fetch('/api/sets');
      if (setsRes.ok) {
        const setList: CardSet[] = await setsRes.json();
        setSets(setList);

        // Fetch cards for each set
        const newMap = new Map<string, Card>();
        for (const s of setList) {
          const cardsRes = await fetch(`/api/sets/${s.id}/cards`);
          if (cardsRes.ok) {
            const cardList: Card[] = await cardsRes.json();
            cardList.forEach(c => newMap.set(c.id, c));
          }
        }
        setCardsMap(newMap);
      }
    } catch (e) {
      console.error('Failed to load sets/cards:', e);
    }
  }, []);

  useEffect(() => {
    refreshSetsAndCards();
  }, [refreshSetsAndCards]);

  // Active CardSet
  const activeSet = sets.find(s => s.id === room?.activeSetId) || null;

  // Initialize Socket
  useEffect(() => {
    const s = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    s.on('connect', () => {
      setConnected(true);

      // Auto-reconnect if saved in localStorage
      const savedRoomId = localStorage.getItem('bga_room_id');
      const savedPlayerId = (savedRoomId && localStorage.getItem(`bga_player_for_${savedRoomId}`)) || localStorage.getItem('bga_player_id');
      const savedPlayerName = localStorage.getItem('bga_player_name') || 'Player';

      if (savedRoomId) {
        s.emit(
          'room:join',
          { roomId: savedRoomId, playerName: savedPlayerName, playerId: savedPlayerId || undefined },
          (res: any) => {
            if (res?.success) {
              setRoom(res.room);
              setPlayer(res.player);
              localStorage.setItem(`bga_player_for_${res.room.id}`, res.player.id);
              localStorage.setItem('bga_player_id', res.player.id);
            } else {
              localStorage.removeItem('bga_room_id');
            }
          }
        );
      }
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('room:updated', (updatedRoom: RoomState) => {
      // Only process updates if we are actively in this room
      const activeRoomId = localStorage.getItem('bga_room_id');
      if (!activeRoomId || activeRoomId !== updatedRoom.id) {
        return;
      }
      setRoom(updatedRoom);
      // Keep player reference in sync
      const pId = localStorage.getItem('bga_player_id') || localStorage.getItem(`bga_player_for_${updatedRoom.id}`);
      if (pId && updatedRoom.players[pId]) {
        setPlayer(updatedRoom.players[pId]);
      } else {
        // If our player was removed from this room, exit back to lobby screen
        setPlayer(null);
        setRoom(null);
        localStorage.removeItem('bga_room_id');
        localStorage.removeItem('bga_player_id');
        if (updatedRoom.id) {
          localStorage.removeItem(`bga_player_for_${updatedRoom.id}`);
        }
      }
    });

    s.on('dice:rolled', (rollResult: DiceRollResult) => {
      setRecentRoll(rollResult);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Room Actions
  const createRoom = async (hostName: string, preferredSetId?: string) => {
    if (!socket) return;
    return new Promise<void>((resolve, reject) => {
      socket.emit('room:create', { hostName, preferredSetId }, (res: any) => {
        if (res?.success) {
          setRoom(res.room);
          setPlayer(res.room.players[res.hostId]);
          localStorage.setItem('bga_room_id', res.room.id);
          localStorage.setItem('bga_player_id', res.hostId);
          localStorage.setItem(`bga_player_for_${res.room.id}`, res.hostId);
          localStorage.setItem('bga_player_name', hostName);
          resolve();
        } else {
          setError(res?.error || 'Failed to create room');
          reject(new Error(res?.error));
        }
      });
    });
  };

  const joinRoom = async (roomId: string, playerName: string) => {
    if (!socket) return;
    const cleanRoomCode = roomId.trim().toUpperCase();
    return new Promise<void>((resolve, reject) => {
      const existingId = localStorage.getItem(`bga_player_for_${cleanRoomCode}`) || localStorage.getItem('bga_player_id') || undefined;
      socket.emit('room:join', { roomId: cleanRoomCode, playerName, playerId: existingId }, (res: any) => {
        if (res?.success) {
          setRoom(res.room);
          setPlayer(res.player);
          localStorage.setItem('bga_room_id', res.room.id);
          localStorage.setItem('bga_player_id', res.player.id);
          localStorage.setItem(`bga_player_for_${res.room.id}`, res.player.id);
          localStorage.setItem('bga_player_name', playerName);
          resolve();
        } else {
          setError(res?.error || 'Failed to join room');
          reject(new Error(res?.error));
        }
      });
    });
  };

  const leaveRoom = () => {
    if (socket && room && player) {
      socket.emit('room:leave', { roomId: room.id, playerId: player.id });
    }
    if (room) {
      localStorage.removeItem(`bga_player_for_${room.id}`);
    }
    localStorage.removeItem('bga_room_id');
    localStorage.removeItem('bga_player_id');
    setRoom(null);
    setPlayer(null);
  };

  const removePlayer = async (playerId: string) => {
    if (!socket || !room) return;
    return new Promise<void>((resolve, reject) => {
      socket.emit('player:remove', { roomId: room.id, playerId }, (res: any) => {
        if (res?.success) {
          if (player?.id === playerId) {
            leaveRoom();
          }
          resolve();
        } else {
          setError(res?.error || 'Failed to remove player');
          reject(new Error(res?.error));
        }
      });
    });
  };

  // Set & Deck Actions
  const switchSet = async (setId: string) => {
    if (!socket || !room) return;
    socket.emit('set:switch', { roomId: room.id, setId });
  };

  const configureDecks = async (groupByKeys?: string[], filters?: Record<string, string[]>) => {
    if (!socket || !room) return;
    socket.emit('decks:configure', {
      roomId: room.id,
      groupByKeys: groupByKeys ?? room.deckGroupByKeys,
      filters: filters ?? room.deckFilters
    });
  };

  const setDeckFilters = async (filters: Record<string, string[]>) => {
    if (!socket || !room) return;
    socket.emit('decks:setFilters', { roomId: room.id, filters });
  };

  const drawCards = async (deckId: string, count: number = 1) => {
    if (!socket || !room || !player) return;
    socket.emit('deck:draw', { roomId: room.id, playerId: player.id, deckId, count });
  };

  const discardCard = async (cardId: string) => {
    if (!socket || !room || !player) return;
    socket.emit('hand:discard', { roomId: room.id, playerId: player.id, cardId });
  };

  const returnCard = async (cardId: string, targetDeckId?: string) => {
    if (!socket || !room || !player) return;
    socket.emit('hand:return', { roomId: room.id, playerId: player.id, cardId, targetDeckId });
  };

  // Table Pool Actions
  const submitToPool = async (cardId: string) => {
    if (!socket || !room || !player) return;
    socket.emit('pool:submit', { roomId: room.id, playerId: player.id, cardId });
  };

  const addDummyToPool = async (deckId: string, count: number = 1) => {
    if (!socket || !room) return;
    socket.emit('pool:addDummy', { roomId: room.id, deckId, count });
  };

  const revealPool = async () => {
    if (!socket || !room) return;
    socket.emit('pool:reveal', { roomId: room.id });
  };

  const resetPool = async (discard: boolean = true) => {
    if (!socket || !room) return;
    socket.emit('pool:reset', { roomId: room.id, discard });
  };

  const resetRound = async (reshuffleDecks: boolean = false) => {
    if (!socket || !room) return;
    socket.emit('round:reset', { roomId: room.id, reshuffleDecks });
  };

  // Score Matrix Actions
  const updateScore = async (playerId: string, columnId: string, deltaOrValue: number, isAbsolute: boolean = false) => {
    if (!socket || !room) return;
    socket.emit('score:update', { roomId: room.id, playerId, columnId, deltaOrValue, isAbsolute });
  };

  const addScoreColumn = async (label?: string) => {
    if (!socket || !room) return;
    socket.emit('score:addColumn', { roomId: room.id, label });
  };

  const removeScoreColumn = async (columnId: string) => {
    if (!socket || !room) return;
    socket.emit('score:removeColumn', { roomId: room.id, columnId });
  };

  const renameScoreColumn = async (columnId: string, label: string) => {
    if (!socket || !room) return;
    socket.emit('score:renameColumn', { roomId: room.id, columnId, label });
  };

  const addScorePlayer = async (name: string) => {
    if (!socket || !room) return;
    socket.emit('score:addPlayer', { roomId: room.id, name });
  };

  const removeScorePlayer = async (playerId: string) => {
    if (!socket || !room) return;
    socket.emit('score:removePlayer', { roomId: room.id, playerId });
  };

  // Tools Actions
  const randomizeOrder = async (direction?: 'clockwise' | 'counter-clockwise') => {
    if (!socket || !room) return;
    socket.emit('order:randomize', { roomId: room.id, direction });
  };

  const rollDice = async (dice: DiceDie[], modifier: number = 0) => {
    if (!socket || !room || !player) return;
    socket.emit('dice:roll', { roomId: room.id, playerId: player.id, dice, modifier });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        room,
        player,
        sets,
        activeSet: room ? sets.find(s => s.id === room.activeSetId) || null : null,
        cardsMap,
        recentRoll,
        error,
        clearError,
        createRoom,
        joinRoom,
        leaveRoom,
        removePlayer,
        switchSet,
        configureDecks,
        setDeckFilters,
        drawCards,
        discardCard,
        returnCard,
        submitToPool,
        addDummyToPool,
        revealPool,
        resetPool,
        resetRound,
        updateScore,
        addScoreColumn,
        removeScoreColumn,
        renameScoreColumn,
        addScorePlayer,
        removeScorePlayer,
        randomizeOrder,
        rollDice,
        refreshSetsAndCards
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
};
