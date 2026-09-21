import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { seedDatabase } from './db/seed.js';
import { db } from './db/store.js';
import { RoomManager } from './rooms/roomManager.js';
import { setRouter } from './routes/setRoutes.js';
import { wikiRouter } from './routes/wikiRoutes.js';
import { printServerStartupBanner } from './utils/qr.js';

export function createAppServer() {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // REST Routes
  app.use('/api', setRouter);
  app.use('/api/wiki', wikiRouter);

  // Health check and room query
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  app.get('/api/rooms/:id', (req, res) => {
    const room = db.getRoom(req.params.id.toUpperCase());
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  });

  // Socket.io Real-time Lobby Management
  // Active socket tracking per room & player: `${roomId}:${playerId}` -> Set<socket.id>
  const playerSockets = new Map<string, Set<string>>();

  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    let currentPlayerId: string | null = null;

    // Create Room
    socket.on('room:create', async (data: { hostName: string; preferredSetId?: string }, callback) => {
      try {
        const { room, hostId } = await RoomManager.createRoom(data.hostName, data.preferredSetId);
        currentRoomId = room.id;
        currentPlayerId = hostId;
        const key = `${room.id}:${hostId}`;
        if (!playerSockets.has(key)) playerSockets.set(key, new Set());
        playerSockets.get(key)!.add(socket.id);

        socket.join(room.id);
        callback?.({ success: true, room, hostId });
        io.to(room.id).emit('room:updated', room);
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Join Room
    socket.on('room:join', async (data: { roomId: string; playerName: string; playerId?: string }, callback) => {
      try {
        const { room, player } = await RoomManager.joinRoom(data.roomId, data.playerName, data.playerId);
        currentRoomId = room.id;
        currentPlayerId = player.id;
        const key = `${room.id}:${player.id}`;
        if (!playerSockets.has(key)) playerSockets.set(key, new Set());
        playerSockets.get(key)!.add(socket.id);

        socket.join(room.id);
        callback?.({ success: true, room, player });
        io.to(room.id).emit('room:updated', room);
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Switch Set
    socket.on('set:switch', async (data: { roomId: string; setId: string }, callback) => {
      try {
        const room = await RoomManager.setActiveSet(data.roomId, data.setId);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Configure Deck Splitting & Filters
    socket.on('decks:configure', async (data: { roomId: string; groupByKeys?: string[]; filters?: Record<string, string[] | string> }, callback) => {
      try {
        const room = await RoomManager.configureDeckSplitting(data.roomId, data.groupByKeys, data.filters);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    socket.on('decks:setFilters', async (data: { roomId: string; filters: Record<string, string[] | string> }, callback) => {
      try {
        const room = await RoomManager.setDeckFilters(data.roomId, data.filters);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Draw Cards
    socket.on('deck:draw', async (data: { roomId: string; playerId: string; deckId: string; count?: number }, callback) => {
      try {
        const room = await RoomManager.drawCards(data.roomId, data.playerId, data.deckId, data.count || 1);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Discard Card from Hand
    socket.on('hand:discard', async (data: { roomId: string; playerId: string; cardId: string }, callback) => {
      try {
        const room = await RoomManager.discardCard(data.roomId, data.playerId, data.cardId);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Return Card to Deck
    socket.on('hand:return', async (data: { roomId: string; playerId: string; cardId: string; targetDeckId?: string }, callback) => {
      try {
        const room = await RoomManager.returnCardToDeck(data.roomId, data.playerId, data.cardId, data.targetDeckId);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Submit Card to Table Pool face-down
    socket.on('pool:submit', async (data: { roomId: string; playerId: string; cardId: string }, callback) => {
      try {
        const room = await RoomManager.submitCardToPool(data.roomId, data.playerId, data.cardId);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Add Dummy/Noise cards to Table Pool face-down
    socket.on('pool:addDummy', async (data: { roomId: string; deckId: string; count?: number }, callback) => {
      try {
        const room = await RoomManager.addDummyCardsToPool(data.roomId, data.deckId, data.count || 1);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Reveal Table Pool
    socket.on('pool:reveal', async (data: { roomId: string }, callback) => {
      try {
        const room = await RoomManager.revealTablePool(data.roomId);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Reset Table Pool
    socket.on('pool:reset', async (data: { roomId: string; discard?: boolean }, callback) => {
      try {
        const room = await RoomManager.resetTablePool(data.roomId, data.discard ?? true);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Reset Round
    socket.on('round:reset', async (data: { roomId: string; reshuffleDecks?: boolean }, callback) => {
      try {
        const room = await RoomManager.resetRound(data.roomId, data.reshuffleDecks ?? false);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Score Table: Update Cell
    socket.on('score:update', async (data: { roomId: string; playerId: string; columnId: string; deltaOrValue: number; isAbsolute?: boolean }, callback) => {
      try {
        const room = await RoomManager.updateScoreCell(data.roomId, data.playerId, data.columnId, data.deltaOrValue, data.isAbsolute ?? false);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Score Table: Add Column
    socket.on('score:addColumn', async (data: { roomId: string; label?: string }, callback) => {
      try {
        const room = await RoomManager.addScoreColumn(data.roomId, data.label);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Score Table: Remove Column
    socket.on('score:removeColumn', async (data: { roomId: string; columnId: string }, callback) => {
      try {
        const room = await RoomManager.removeScoreColumn(data.roomId, data.columnId);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Score Table: Rename Column
    socket.on('score:renameColumn', async (data: { roomId: string; columnId: string; label: string }, callback) => {
      try {
        const room = await RoomManager.renameScoreColumn(data.roomId, data.columnId, data.label);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Score Table: Add Custom/Guest Player
    socket.on('score:addPlayer', async (data: { roomId: string; name: string }, callback) => {
      try {
        const room = await RoomManager.addCustomScorePlayer(data.roomId, data.name);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Score Table: Remove Custom/Guest Player
    socket.on('score:removePlayer', async (data: { roomId: string; playerId: string }, callback) => {
      try {
        const room = await RoomManager.removeCustomScorePlayer(data.roomId, data.playerId);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Turn Order: Randomize
    socket.on('order:randomize', async (data: { roomId: string; direction?: 'clockwise' | 'counter-clockwise' }, callback) => {
      try {
        const room = await RoomManager.randomizeTurnOrder(data.roomId, data.direction);
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Dice: Roll
    socket.on('dice:roll', async (data: { roomId: string; playerId: string; dice: any[]; modifier?: number }, callback) => {
      try {
        const { room, result } = await RoomManager.rollDice(data.roomId, data.playerId, data.dice, data.modifier || 0);
        io.to(room.id).emit('room:updated', room);
        io.to(room.id).emit('dice:rolled', result);
        callback?.({ success: true, room, result });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Explicit Leave Room
    socket.on('room:leave', async (data: { roomId: string; playerId: string }, callback) => {
      try {
        const room = await RoomManager.removePlayer(data.roomId, data.playerId);
        const key = `${data.roomId}:${data.playerId}`;
        playerSockets.delete(key);
        socket.leave(data.roomId);
        if (currentRoomId === data.roomId) currentRoomId = null;
        if (currentPlayerId === data.playerId) currentPlayerId = null;

        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Remove / Kick Player from Room
    socket.on('player:remove', async (data: { roomId: string; playerId: string }, callback) => {
      try {
        const room = await RoomManager.removePlayer(data.roomId, data.playerId);
        const key = `${data.roomId}:${data.playerId}`;
        playerSockets.delete(key);
        if (currentPlayerId === data.playerId) {
          socket.leave(data.roomId);
          currentRoomId = null;
          currentPlayerId = null;
        }
        io.to(room.id).emit('room:updated', room);
        callback?.({ success: true, room });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      if (currentRoomId && currentPlayerId) {
        const key = `${currentRoomId}:${currentPlayerId}`;
        const sockets = playerSockets.get(key);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            playerSockets.delete(key);
            const updated = await RoomManager.setPlayerConnected(currentRoomId, currentPlayerId, false);
            if (updated) {
              io.to(currentRoomId).emit('room:updated', updated);
            }
          }
        } else {
          const updated = await RoomManager.setPlayerConnected(currentRoomId, currentPlayerId, false);
          if (updated) {
            io.to(currentRoomId).emit('room:updated', updated);
          }
        }
      }
    });
  });

  return { app, server, io };
}

const PORT = process.env.PORT || 3001;

// Only start standalone server if executed directly as main entry, not during tests
const isMain = process.argv[1] &&
  (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js')) &&
  !process.argv.some(arg => arg.includes('test'));

if (isMain) {
  const { server } = createAppServer();
  seedDatabase().then(() => {
    server.listen(PORT, async () => {
      await printServerStartupBanner(Number(PORT), 5173);
    });
  }).catch(console.error);
}
