import fs from 'fs';
import path from 'path';
import { CardSet, Card, RoomState } from '../types/index.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const SETS_FILE = path.join(DATA_DIR, 'sets.json');
const CARDS_FILE = path.join(DATA_DIR, 'cards.json');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

// Memory store
class DatabaseStore {
  private sets: Map<string, CardSet> = new Map();
  private cards: Map<string, Card> = new Map();
  private rooms: Map<string, RoomState> = new Map();
  private initialized = false;

  private writeQueues: Map<string, Promise<void>> = new Map();

  private async writeAtomic(filePath: string, data: any): Promise<void> {
    const prev = this.writeQueues.get(filePath) || Promise.resolve();
    const next = prev.catch(() => {}).then(async () => {
      const content = JSON.stringify(data, null, 2);
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await fs.promises.writeFile(filePath, content, 'utf-8');
          break;
        } catch (err: any) {
          if (attempt === 4 || (err.code !== 'EPERM' && err.code !== 'EBUSY')) {
            throw err;
          }
          await new Promise(r => setTimeout(r, 20));
        }
      }
    });
    this.writeQueues.set(filePath, next);
    return next;
  }

  async init() {
    if (this.initialized) return;

    try {
      if (fs.existsSync(SETS_FILE)) {
        const raw = (await fs.promises.readFile(SETS_FILE, 'utf-8')).trim();
        if (raw) {
          const list: CardSet[] = JSON.parse(raw);
          list.forEach(s => this.sets.set(s.id, s));
        }
      }
    } catch (e) {
      console.error('Failed to load sets.json:', e);
    }

    try {
      if (fs.existsSync(CARDS_FILE)) {
        const raw = (await fs.promises.readFile(CARDS_FILE, 'utf-8')).trim();
        if (raw) {
          const list: Card[] = JSON.parse(raw);
          list.forEach(c => this.cards.set(c.id, c));
        }
      }
    } catch (e) {
      console.error('Failed to load cards.json:', e);
    }

    try {
      if (fs.existsSync(ROOMS_FILE)) {
        const raw = (await fs.promises.readFile(ROOMS_FILE, 'utf-8')).trim();
        if (raw) {
          const list: RoomState[] = JSON.parse(raw);
          list.forEach(r => this.rooms.set(r.id, r));
        }
      }
    } catch (e) {
      console.error('Failed to load rooms.json:', e);
    }

    this.initialized = true;
  }

  // --- Sets ---
  getSets(): CardSet[] {
    return Array.from(this.sets.values());
  }

  getSet(id: string): CardSet | undefined {
    return this.sets.get(id);
  }

  async saveSet(set: CardSet): Promise<CardSet> {
    this.sets.set(set.id, set);
    await this.writeAtomic(SETS_FILE, this.getSets());
    return set;
  }

  async deleteSet(id: string): Promise<boolean> {
    const deleted = this.sets.delete(id);
    if (deleted) {
      // Also delete all cards belonging to this set
      const cardsToDelete: string[] = [];
      for (const [cId, card] of this.cards.entries()) {
        if (card.setId === id) cardsToDelete.push(cId);
      }
      for (const cId of cardsToDelete) {
        this.cards.delete(cId);
      }
      await this.writeAtomic(SETS_FILE, this.getSets());
      await this.writeAtomic(CARDS_FILE, this.getCards());
    }
    return deleted;
  }

  // --- Cards ---
  getCards(setId?: string): Card[] {
    const all = Array.from(this.cards.values());
    if (setId) {
      return all.filter(c => c.setId === setId);
    }
    return all;
  }

  getCard(id: string): Card | undefined {
    return this.cards.get(id);
  }

  async saveCard(card: Card): Promise<Card> {
    this.cards.set(card.id, card);
    await this.writeAtomic(CARDS_FILE, this.getCards());
    return card;
  }

  async saveCards(cards: Card[]): Promise<Card[]> {
    for (const card of cards) {
      this.cards.set(card.id, card);
    }
    await this.writeAtomic(CARDS_FILE, this.getCards());
    return cards;
  }

  async deleteCard(id: string): Promise<boolean> {
    const deleted = this.cards.delete(id);
    if (deleted) {
      await this.writeAtomic(CARDS_FILE, this.getCards());
    }
    return deleted;
  }

  // --- Rooms ---
  getRoom(id: string): RoomState | undefined {
    return this.rooms.get(id);
  }

  listRooms(): RoomState[] {
    return Array.from(this.rooms.values());
  }

  async saveRoom(room: RoomState): Promise<RoomState> {
    this.rooms.set(room.id, room);
    await this.writeAtomic(ROOMS_FILE, this.listRooms());
    return room;
  }

  async deleteRoom(id: string): Promise<boolean> {
    const deleted = this.rooms.delete(id);
    if (deleted) {
      await this.writeAtomic(ROOMS_FILE, this.listRooms());
    }
    return deleted;
  }
}

export const db = new DatabaseStore();
