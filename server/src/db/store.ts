import fs from 'fs';
import path from 'path';
import { CardSet, Card, RoomState } from '../types/index.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const SETS_FILE = path.join(DATA_DIR, 'sets.json');
const BASE_CARDS_FILE = path.join(DATA_DIR, 'cards.json');
const CUSTOM_CARDS_FILE = path.join(DATA_DIR, 'custom_cards.json');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

// Memory store
class DatabaseStore {
  private sets: Map<string, CardSet> = new Map();
  private cards: Map<string, Card> = new Map();
  private baseCardIds: Set<string> = new Set();
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

    // 1. Load Sets
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

    // 2. Load committed base cards (tracked in Git)
    try {
      if (fs.existsSync(BASE_CARDS_FILE)) {
        const raw = (await fs.promises.readFile(BASE_CARDS_FILE, 'utf-8')).trim();
        if (raw) {
          const list: Card[] = JSON.parse(raw);
          list.forEach(c => {
            this.cards.set(c.id, c);
            this.baseCardIds.add(c.id);
          });
        }
      }
    } catch (e) {
      console.error('Failed to load cards.json:', e);
    }

    // 3. Load uncommitted custom cards (local-only, ignored by Git)
    try {
      if (fs.existsSync(CUSTOM_CARDS_FILE)) {
        const raw = (await fs.promises.readFile(CUSTOM_CARDS_FILE, 'utf-8')).trim();
        if (raw) {
          const list: Card[] = JSON.parse(raw);
          list.forEach(c => {
            this.cards.set(c.id, c);
          });
        }
      }
    } catch (e) {
      console.error('Failed to load custom_cards.json:', e);
    }

    // 4. Load Rooms
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
      let baseTouched = false;
      let customTouched = false;
      const cardsToDelete: string[] = [];
      for (const [cId, card] of this.cards.entries()) {
        if (card.setId === id) cardsToDelete.push(cId);
      }
      for (const cId of cardsToDelete) {
        if (this.baseCardIds.has(cId)) {
          this.baseCardIds.delete(cId);
          baseTouched = true;
        } else {
          customTouched = true;
        }
        this.cards.delete(cId);
      }
      await this.writeAtomic(SETS_FILE, this.getSets());
      if (baseTouched) await this.writeBaseCards();
      if (customTouched) await this.writeCustomCards();
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

  getBaseCards(setId?: string): Card[] {
    const list = Array.from(this.cards.values()).filter(c => this.baseCardIds.has(c.id));
    return setId ? list.filter(c => c.setId === setId) : list;
  }

  getCustomCards(setId?: string): Card[] {
    const list = Array.from(this.cards.values()).filter(c => !this.baseCardIds.has(c.id));
    return setId ? list.filter(c => c.setId === setId) : list;
  }

  isBaseCard(cardId: string): boolean {
    return this.baseCardIds.has(cardId);
  }

  registerBaseCard(cardId: string): void {
    this.baseCardIds.add(cardId);
  }

  private async writeBaseCards(): Promise<void> {
    await this.writeAtomic(BASE_CARDS_FILE, this.getBaseCards());
  }

  private async writeCustomCards(): Promise<void> {
    await this.writeAtomic(CUSTOM_CARDS_FILE, this.getCustomCards());
  }

  getCard(id: string): Card | undefined {
    return this.cards.get(id);
  }

  async saveCard(card: Card): Promise<Card> {
    this.cards.set(card.id, card);
    if (this.baseCardIds.has(card.id)) {
      await this.writeBaseCards();
    } else {
      await this.writeCustomCards();
    }
    return card;
  }

  async saveCards(cards: Card[]): Promise<Card[]> {
    let baseTouched = false;
    let customTouched = false;
    for (const card of cards) {
      this.cards.set(card.id, card);
      if (this.baseCardIds.has(card.id)) {
        baseTouched = true;
      } else {
        customTouched = true;
      }
    }
    if (baseTouched) await this.writeBaseCards();
    if (customTouched) await this.writeCustomCards();
    return cards;
  }

  async deleteCard(id: string): Promise<boolean> {
    if (!this.cards.has(id)) return false;

    const isBase = this.baseCardIds.has(id);
    if (isBase) {
      this.baseCardIds.delete(id);
    }
    this.cards.delete(id);

    if (isBase) {
      await this.writeBaseCards();
    } else {
      await this.writeCustomCards();
    }
    return true;
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
