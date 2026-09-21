import { db } from '../db/store.js';
import {
  RoomState,
  Player,
  Deck,
  PlayerHandCard,
  PooledCard,
  ScoreColumn,
  DiceDie,
  DiceRollResult,
  TurnOrderState
} from '../types/index.js';

const PLAYER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#84cc16'  // lime
];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getAvailablePlayerColor(currentPlayers: Record<string, Player>, excludePlayerId?: string): string {
  const usedColors = new Set(
    Object.values(currentPlayers)
      .filter(p => p.id !== excludePlayerId)
      .map(p => p.color?.toLowerCase())
      .filter(Boolean)
  );
  for (const color of PLAYER_COLORS) {
    if (!usedColors.has(color.toLowerCase())) {
      return color;
    }
  }
  const count = Object.keys(currentPlayers).length;
  return PLAYER_COLORS[count % PLAYER_COLORS.length];
}

export class RoomManager {
  // Generate Decks based on Set cards, groupBy keys, and metadata filters
  static generateDecks(
    setId: string,
    groupByKeys: string[],
    excludedCardIds: Set<string> = new Set(),
    filters?: Record<string, string[] | string>
  ): Record<string, Deck> {
    let cards = db.getCards(setId).filter(c => !excludedCardIds.has(c.id));
    const decks: Record<string, Deck> = {};

    // 1. Filter cards by metadata if filters are provided
    if (filters && Object.keys(filters).length > 0) {
      cards = cards.filter(card => {
        for (const [rawKey, filterVal] of Object.entries(filters)) {
          if (!filterVal) continue;
          const key = rawKey === 'source' ? 'edition' : rawKey;

          let allowedValues: string[] = [];
          if (Array.isArray(filterVal)) {
            allowedValues = filterVal;
          } else if (typeof filterVal === 'string') {
            allowedValues = [filterVal];
          }

          // If allowedValues is empty or includes 'all', ignore this filter
          if (allowedValues.length === 0 || allowedValues.some(v => v.toLowerCase() === 'all')) {
            continue;
          }

          let val = card.data[key];
          if (val === undefined || val === null || val === '') {
            if (key === 'edition') val = card.data.source ?? 'Base';
            else if (key === 'source') val = card.data.edition ?? 'Base';
            else {
              const lower = key.toLowerCase();
              for (const [k, v] of Object.entries(card.data)) {
                if (k.toLowerCase() === lower && v !== undefined && v !== null && v !== '') {
                  val = v;
                  break;
                }
              }
            }
          }
          if (val === undefined || val === null || val === '') {
            val = 'Standard';
          }

          const cardValStr = String(val).toLowerCase();
          const matches = allowedValues.some(v => v.toLowerCase() === cardValStr);
          if (!matches) {
            return false;
          }
        }
        return true;
      });
    }

    if (cards.length === 0) {
      decks['all'] = {
        id: 'all',
        label: 'Main Deck',
        filter: {},
        cardIds: []
      };
      return decks;
    }

    if (!groupByKeys || groupByKeys.length === 0) {
      const allIds = shuffle(cards.map(c => c.id));
      decks['all'] = {
        id: 'all',
        label: 'Main Deck',
        filter: {},
        cardIds: allIds
      };
      return decks;
    }

    // Group cards by combination of values in groupByKeys
    const groups: Map<string, { label: string; filter: Record<string, any>; cardIds: string[] }> = new Map();

    for (const card of cards) {
      const filterObj: Record<string, any> = {};
      const labelParts: string[] = [];

      for (const rawKey of groupByKeys) {
        // Resolve alias (e.g. source <-> edition) and case-insensitivity
        const key = rawKey === 'source' ? 'edition' : rawKey;
        let val = card.data[key];
        if (val === undefined || val === null || val === '') {
          if (key === 'edition') val = card.data.source ?? 'Base';
          else if (key === 'source') val = card.data.edition ?? 'Base';
          else {
            const lower = key.toLowerCase();
            for (const [k, v] of Object.entries(card.data)) {
              if (k.toLowerCase() === lower && v !== undefined && v !== null && v !== '') {
                val = v;
                break;
              }
            }
          }
        }
        if (val === undefined || val === null || val === '') {
          val = 'Standard';
        }
        filterObj[key] = val;
        labelParts.push(String(val));
      }

      const groupKey = labelParts.join(' | ');
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          label: groupKey,
          filter: filterObj,
          cardIds: []
        });
      }
      groups.get(groupKey)!.cardIds.push(card.id);
    }

    // Sort group keys logically (e.g. 1 star before 2 stars, easy before hard)
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    for (const key of sortedKeys) {
      const g = groups.get(key)!;
      const deckId = key.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      decks[deckId] = {
        id: deckId,
        label: g.label,
        filter: g.filter,
        cardIds: shuffle(g.cardIds)
      };
    }

    return decks;
  }

  // Create new room
  static async createRoom(hostName: string, preferredSetId?: string): Promise<{ room: RoomState; hostId: string }> {
    let roomId = generateRoomCode();
    while (db.getRoom(roomId)) {
      roomId = generateRoomCode();
    }

    const sets = db.getSets();
    const activeSetId = preferredSetId && sets.some(s => s.id === preferredSetId)
      ? preferredSetId
      : (sets[0]?.id || 'fdlm');

    const hostId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const host: Player = {
      id: hostId,
      name: hostName.trim() || 'Host',
      isHost: true,
      connected: true,
      joinedAt: Date.now(),
      color: getAvailablePlayerColor({})
    };

    // Determine initial groupBy keys for the active set (default to ALL decked metadata fields for maximum decks)
    const set = db.getSet(activeSetId);
    const filterFields = set?.fields.filter(f => f.isDecked || f.isFilter).map(f => f.key) || [];
    const deckGroupByKeys = [...filterFields];
    const deckFilters: Record<string, string[]> = {};

    const decks = this.generateDecks(activeSetId, deckGroupByKeys, new Set(), deckFilters);

    const room: RoomState = {
      id: roomId,
      activeSetId,
      deckGroupByKeys,
      deckFilters,
      decks,
      hands: { [hostId]: [] },
      discards: [],
      tablePool: {
        cards: [],
        isRevealed: false,
        revealedOrder: []
      },
      scoreTable: {
        columns: [
          { id: 'c_1', label: 'Round 1' },
          { id: 'c_2', label: 'Round 2' },
          { id: 'c_3', label: 'Round 3' }
        ],
        scores: {
          [hostId]: { c_1: 0, c_2: 0, c_3: 0 }
        },
        customPlayers: []
      },
      turnOrder: {
        order: [hostId],
        direction: 'clockwise',
        lastUpdated: Date.now()
      },
      diceHistory: [],
      players: { [hostId]: host },
      createdAt: Date.now(),
      lastActive: Date.now()
    };

    await db.saveRoom(room);
    return { room, hostId };
  }

  // Join existing room
  static async joinRoom(roomId: string, playerName: string, existingPlayerId?: string): Promise<{ room: RoomState; player: Player }> {
    const code = roomId.trim().toUpperCase();
    const room = db.getRoom(code);
    if (!room) {
      throw new Error(`Room "${code}" not found.`);
    }

    const cleanName = playerName.trim();

    // 1. Reconnecting existing player by ID
    if (existingPlayerId && room.players[existingPlayerId]) {
      const player = room.players[existingPlayerId];
      player.connected = true;
      if (cleanName) player.name = cleanName;
      if (!player.color || Object.values(room.players).some(p => p.id !== player.id && p.color?.toLowerCase() === player.color.toLowerCase())) {
        player.color = getAvailablePlayerColor(room.players, player.id);
      }
      room.lastActive = Date.now();
      await db.saveRoom(room);
      return { room, player };
    }

    // 2. Reconnecting existing player by Name (case-insensitive) to prevent duplicate self
    if (cleanName) {
      const existingByName = Object.values(room.players).find(
        p => p.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (existingByName) {
        existingByName.connected = true;
        existingByName.name = cleanName;
        if (!existingByName.color || Object.values(room.players).some(p => p.id !== existingByName.id && p.color?.toLowerCase() === existingByName.color.toLowerCase())) {
          existingByName.color = getAvailablePlayerColor(room.players, existingByName.id);
        }
        room.lastActive = Date.now();
        await db.saveRoom(room);
        return { room, player: existingByName };
      }
    }

    // 3. New player join (only when not found by ID or Name)
    const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const color = getAvailablePlayerColor(room.players);

    const player: Player = {
      id: playerId,
      name: cleanName || `Player ${Object.keys(room.players).length + 1}`,
      isHost: Object.keys(room.players).length === 0,
      connected: true,
      joinedAt: Date.now(),
      color
    };

    room.players[playerId] = player;
    if (!room.hands[playerId]) room.hands[playerId] = [];
    if (!room.scoreTable.scores[playerId]) {
      room.scoreTable.scores[playerId] = {};
      for (const col of room.scoreTable.columns) {
        room.scoreTable.scores[playerId][col.id] = 0;
      }
    }
    if (!room.turnOrder.order.includes(playerId)) {
      room.turnOrder.order.push(playerId);
    }
    room.lastActive = Date.now();

    await db.saveRoom(room);
    return { room, player };
  }

  // Remove / Kick player from room (cleans up duplicates and returned cards)
  static async removePlayer(roomId: string, playerId: string): Promise<RoomState> {
    const code = roomId.trim().toUpperCase();
    const room = db.getRoom(code);
    if (!room) throw new Error(`Room "${code}" not found.`);

    if (!room.players[playerId]) {
      return room;
    }

    const wasHost = room.players[playerId].isHost;

    // 1. Move cards from player's hand back into discard pile
    const hand = room.hands[playerId] || [];
    for (const hc of hand) {
      room.discards.push(hc.cardId);
    }
    delete room.hands[playerId];

    // 2. Remove from players
    delete room.players[playerId];

    // 3. Remove from score table scores
    if (room.scoreTable.scores[playerId]) {
      delete room.scoreTable.scores[playerId];
    }

    // 4. Remove from turn order
    room.turnOrder.order = room.turnOrder.order.filter(id => id !== playerId);

    // 5. Reassign host if removed player was host
    if (wasHost) {
      const remaining = Object.values(room.players);
      if (remaining.length > 0) {
        const nextHost = remaining.find(p => p.connected) || remaining[0];
        nextHost.isHost = true;
      }
    }

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // Set connected status
  static async setPlayerConnected(roomId: string, playerId: string, connected: boolean): Promise<RoomState | null> {
    const room = db.getRoom(roomId);
    if (!room || !room.players[playerId]) return null;

    room.players[playerId].connected = connected;
    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // Switch Active Card Set
  static async setActiveSet(roomId: string, setId: string): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const set = db.getSet(setId);
    if (!set) throw new Error('Set not found');

    room.activeSetId = setId;
    const filterFields = set.fields.filter(f => f.isDecked || f.isFilter).map(f => f.key);
    room.deckGroupByKeys = [...filterFields];
    room.deckFilters = {};
    room.decks = this.generateDecks(setId, room.deckGroupByKeys, new Set(), room.deckFilters);
    room.discards = [];
    room.tablePool = { cards: [], isRevealed: false, revealedOrder: [] };
    for (const pId of Object.keys(room.hands)) {
      room.hands[pId] = [];
    }
    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // Configure Deck Splitting & Filters
  static async configureDeckSplitting(
    roomId: string,
    groupByKeys?: string[],
    filters?: Record<string, string[] | string>
  ): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    if (groupByKeys !== undefined) {
      // Normalize groupByKeys: migrate any 'source' to 'edition'
      const normalizedKeys = (groupByKeys || []).map(k => k === 'source' ? 'edition' : k);
      room.deckGroupByKeys = normalizedKeys;
    }

    if (filters !== undefined) {
      const normalizedFilters: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(filters)) {
        const normKey = k === 'source' ? 'edition' : k;
        if (Array.isArray(v)) {
          normalizedFilters[normKey] = v;
        } else if (typeof v === 'string') {
          normalizedFilters[normKey] = [v];
        }
      }
      room.deckFilters = normalizedFilters;
    }

    // Exclude cards currently in hands, discards, or table pool
    const activeCards = new Set<string>();
    for (const cards of Object.values(room.hands)) {
      cards.forEach(c => activeCards.add(c.cardId));
    }
    room.discards.forEach(cId => activeCards.add(cId));
    room.tablePool.cards.forEach(c => activeCards.add(c.cardId));

    room.decks = this.generateDecks(
      room.activeSetId,
      room.deckGroupByKeys || [],
      activeCards,
      room.deckFilters
    );
    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  static async setDeckFilters(
    roomId: string,
    filters: Record<string, string[] | string>
  ): Promise<RoomState> {
    return this.configureDeckSplitting(roomId, undefined, filters);
  }

  // Draw cards from a specific deck
  static async drawCards(roomId: string, playerId: string, deckId: string, count: number = 1): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    const deck = room.decks[deckId];
    if (!deck) throw new Error(`Deck "${deckId}" not found`);

    if (deck.cardIds.length === 0) {
      throw new Error(`Deck "${deck.label}" is empty.`);
    }

    const drawCount = Math.min(count, deck.cardIds.length);
    const drawnIds = deck.cardIds.splice(0, drawCount);

    if (!room.hands[playerId]) room.hands[playerId] = [];
    for (const cardId of drawnIds) {
      room.hands[playerId].push({
        cardId,
        drawnFromDeckId: deckId,
        drawnAt: Date.now()
      });
    }

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // Discard card from hand
  static async discardCard(roomId: string, playerId: string, cardId: string): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (!room.hands[playerId]) return room;

    const idx = room.hands[playerId].findIndex(c => c.cardId === cardId);
    if (idx !== -1) {
      room.hands[playerId].splice(idx, 1);
      room.discards.push(cardId);
    }

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // Return card to its originating deck (or main deck)
  static async returnCardToDeck(roomId: string, playerId: string, cardId: string, targetDeckId?: string): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (!room.hands[playerId]) return room;

    const idx = room.hands[playerId].findIndex(c => c.cardId === cardId);
    if (idx !== -1) {
      const card = room.hands[playerId][idx];
      room.hands[playerId].splice(idx, 1);

      const targetId = targetDeckId || card.drawnFromDeckId;
      const targetDeck = room.decks[targetId] || Object.values(room.decks)[0];
      if (targetDeck) {
        // Insert card and shuffle
        targetDeck.cardIds.push(cardId);
        targetDeck.cardIds = shuffle(targetDeck.cardIds);
      } else {
        room.discards.push(cardId);
      }
    }

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // Submit card from hand to Table Pool face-down
  static async submitCardToPool(roomId: string, playerId: string, cardId: string): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (!room.hands[playerId]) return room;

    const idx = room.hands[playerId].findIndex(c => c.cardId === cardId);
    if (idx !== -1) {
      room.hands[playerId].splice(idx, 1);
      room.tablePool.cards.push({
        id: `pool_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        cardId,
        isDummy: false,
        submittedBy: playerId,
        submittedAt: Date.now()
      });
      // If pool was already revealed, re-shuffle
      if (room.tablePool.isRevealed) {
        room.tablePool.revealedOrder = shuffle(room.tablePool.cards.map(c => c.cardId));
      }
    }

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // Add dummy/noise cards from a deck directly into Table Pool face-down
  static async addDummyCardsToPool(roomId: string, deckId: string, count: number): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    const deck = room.decks[deckId];
    if (!deck) throw new Error(`Deck "${deckId}" not found`);

    const drawCount = Math.min(count, deck.cardIds.length);
    if (drawCount === 0) throw new Error('Not enough cards in deck');

    const drawnIds = deck.cardIds.splice(0, drawCount);
    for (const cardId of drawnIds) {
      room.tablePool.cards.push({
        id: `pool_dummy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        cardId,
        isDummy: true,
        submittedBy: undefined,
        submittedAt: Date.now()
      });
    }

    if (room.tablePool.isRevealed) {
      room.tablePool.revealedOrder = shuffle(room.tablePool.cards.map(c => c.cardId));
    }

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // Reveal Table Pool (shuffles all pooled cards and displays them)
  static async revealTablePool(roomId: string): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    room.tablePool.isRevealed = true;
    room.tablePool.revealedOrder = shuffle(room.tablePool.cards.map(c => c.cardId));
    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // Clear / Reset Table Pool
  static async resetTablePool(roomId: string, discard: boolean = true): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    if (discard) {
      room.tablePool.cards.forEach(c => room.discards.push(c.cardId));
    }
    room.tablePool = {
      cards: [],
      isRevealed: false,
      revealedOrder: []
    };

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // Reset entire round (all hands and pool)
  static async resetRound(roomId: string, reshuffleDecks: boolean = false): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    if (reshuffleDecks) {
      // Re-generate decks from scratch respecting filters
      room.decks = this.generateDecks(room.activeSetId, room.deckGroupByKeys, new Set(), room.deckFilters);
      room.discards = [];
    } else {
      // Move all hand cards and pool cards to discards
      for (const pId of Object.keys(room.hands)) {
        room.hands[pId].forEach(c => room.discards.push(c.cardId));
      }
      room.tablePool.cards.forEach(c => room.discards.push(c.cardId));
    }

    for (const pId of Object.keys(room.hands)) {
      room.hands[pId] = [];
    }
    room.tablePool = {
      cards: [],
      isRevealed: false,
      revealedOrder: []
    };

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // --- Score Matrix Operations ---
  static async updateScoreCell(roomId: string, playerId: string, columnId: string, deltaOrValue: number, isAbsolute: boolean = false): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    if (!room.scoreTable.scores[playerId]) {
      room.scoreTable.scores[playerId] = {};
    }

    const current = room.scoreTable.scores[playerId][columnId] ?? 0;
    room.scoreTable.scores[playerId][columnId] = isAbsolute ? deltaOrValue : current + deltaOrValue;

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  static async addScoreColumn(roomId: string, label?: string): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const colIndex = room.scoreTable.columns.length + 1;
    const colId = `c_${Date.now()}`;
    room.scoreTable.columns.push({
      id: colId,
      label: label?.trim() || `Round ${colIndex}`
    });

    for (const pId of Object.keys(room.scoreTable.scores)) {
      room.scoreTable.scores[pId][colId] = 0;
    }

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  static async removeScoreColumn(roomId: string, columnId: string): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    room.scoreTable.columns = room.scoreTable.columns.filter(c => c.id !== columnId);
    for (const pId of Object.keys(room.scoreTable.scores)) {
      delete room.scoreTable.scores[pId][columnId];
    }

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  static async renameScoreColumn(roomId: string, columnId: string, label: string): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const col = room.scoreTable.columns.find(c => c.id === columnId);
    if (col) {
      col.label = label.trim();
    }

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  static async addCustomScorePlayer(roomId: string, name: string): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const customId = `guest_${Date.now()}`;
    room.scoreTable.customPlayers.push({
      id: customId,
      name: name.trim() || 'Guest'
    });

    room.scoreTable.scores[customId] = {};
    for (const col of room.scoreTable.columns) {
      room.scoreTable.scores[customId][col.id] = 0;
    }

    if (!room.turnOrder.order.includes(customId)) {
      room.turnOrder.order.push(customId);
    }

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  static async removeCustomScorePlayer(roomId: string, playerId: string): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    room.scoreTable.customPlayers = room.scoreTable.customPlayers.filter(p => p.id !== playerId);
    if (room.scoreTable.scores[playerId]) {
      delete room.scoreTable.scores[playerId];
    }
    room.turnOrder.order = room.turnOrder.order.filter(id => id !== playerId);

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // --- Turn Order Operations ---
  static async randomizeTurnOrder(roomId: string, direction?: 'clockwise' | 'counter-clockwise'): Promise<RoomState> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const allPlayerIds = [
      ...Object.keys(room.players),
      ...room.scoreTable.customPlayers.map(p => p.id)
    ];

    room.turnOrder = {
      order: shuffle(allPlayerIds),
      direction: direction || room.turnOrder.direction || 'clockwise',
      lastUpdated: Date.now()
    };

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return room;
  }

  // --- Dice Roller Operations ---
  static async rollDice(roomId: string, playerId: string, dice: DiceDie[], modifier: number = 0): Promise<{ room: RoomState; result: DiceRollResult }> {
    const room = db.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const playerName = room.players[playerId]?.name || room.scoreTable.customPlayers.find(p => p.id === playerId)?.name || 'Player';

    const rolls: number[] = [];
    let sum = 0;

    for (const die of dice) {
      for (let i = 0; i < die.count; i++) {
        const val = Math.floor(Math.random() * die.sides) + 1;
        rolls.push(val);
        sum += val;
      }
    }

    const total = sum + modifier;

    const result: DiceRollResult = {
      id: `roll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      playerId,
      playerName,
      dice,
      modifier,
      rolls,
      total,
      timestamp: Date.now()
    };

    room.diceHistory.unshift(result);
    // Keep max 50 recent rolls
    if (room.diceHistory.length > 50) {
      room.diceHistory.pop();
    }

    room.lastActive = Date.now();
    await db.saveRoom(room);
    return { room, result };
  }
}
