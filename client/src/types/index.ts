export type FieldType = 'text' | 'multilingual' | 'image' | 'wikipedia' | 'select' | 'tags';

export interface SetFieldDef {
  key: string;
  label: string;
  type: FieldType;
  isDecked?: boolean; // Decked metadata: used to partition cards into Decks AND displayed on card
  isDisplay?: boolean; // Display on the card face
  isFilter?: boolean;  // Kept as alias for isDecked (backward compatibility)
  options?: string[];
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
  submittedBy?: string;
  submittedAt: number;
}

export interface RoomTablePool {
  cards: PooledCard[];
  isRevealed: boolean;
  revealedOrder: string[];
}

export interface ScoreColumn {
  id: string;
  label: string;
}

export interface ScoreTable {
  columns: ScoreColumn[];
  scores: Record<string, Record<string, number>>;
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
  order: string[];
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
  id: string;
  activeSetId: string;
  deckGroupByKeys: string[];
  decks: Record<string, Deck>;
  hands: Record<string, PlayerHandCard[]>;
  discards: string[];
  tablePool: RoomTablePool;
  scoreTable: ScoreTable;
  turnOrder: TurnOrderState;
  diceHistory: DiceRollResult[];
  players: Record<string, Player>;
  createdAt: number;
  lastActive: number;
}
