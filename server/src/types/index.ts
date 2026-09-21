export type FieldType = 'text' | 'multilingual' | 'image' | 'wikipedia' | 'select' | 'tags';

export interface SetFieldDef {
  key: string;
  label: string;
  type: FieldType;
  isDecked?: boolean; // Decked metadata: used to partition cards into Decks AND displayed on card
  isDisplay?: boolean; // Display on the card face
  isFilter?: boolean;  // Kept as alias for isDecked (backward compatibility)
  options?: string[]; // Allowed options if type is 'select'
  description?: string;
}

export interface CardSet {
  id: string;
  name: string;
  description: string;
  fields: SetFieldDef[];
  createdAt: number;
}

export interface Card {
  id: string;
  setId: string;
  data: Record<string, any>;
  createdAt: number;
}

export interface Deck {
  id: string;
  label: string;
  filter: Record<string, any>;
  cardIds: string[];
}

export interface PlayerHandCard {
  cardId: string;
  drawnFromDeckId: string;
  drawnAt: number;
}

export interface PooledCard {
  id: string;
  cardId: string;
  isDummy: boolean;
  submittedBy?: string; // Player ID (empty if dummy)
  submittedAt: number;
}

export interface RoomTablePool {
  cards: PooledCard[];
  isRevealed: boolean;
  revealedOrder: string[]; // Shuffled cardIds
}

export interface ScoreColumn {
  id: string;
  label: string;
}

export interface ScoreTable {
  columns: ScoreColumn[];
  scores: Record<string, Record<string, number>>; // scores[playerId][columnId] = number
  customPlayers: { id: string; name: string }[];
}

export interface DiceDie {
  count: number;
  sides: number;
}

export interface DiceRollResult {
  id: string;
  playerId: string;
  playerName: string;
  dice: DiceDie[];
  modifier: number;
  rolls: number[];
  total: number;
  timestamp: number;
}

export interface TurnOrderState {
  order: string[]; // Player IDs (and custom player IDs)
  direction: 'clockwise' | 'counter-clockwise';
  lastUpdated: number;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  joinedAt: number;
  color: string;
}

export interface RoomState {
  id: string; // 4-letter room code (e.g. ABCD)
  activeSetId: string;
  deckGroupByKeys: string[];
  deckFilters?: Record<string, string[]>;
  decks: Record<string, Deck>;
  hands: Record<string, PlayerHandCard[]>; // playerId -> list of cards in hand
  discards: string[]; // cardIds
  tablePool: RoomTablePool;
  scoreTable: ScoreTable;
  turnOrder: TurnOrderState;
  diceHistory: DiceRollResult[];
  players: Record<string, Player>;
  createdAt: number;
  lastActive: number;
}
