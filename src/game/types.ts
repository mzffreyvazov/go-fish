export type CandyColor = 'red' | 'orange' | 'yellow' | 'green' | 'purple';

export type LineLength = 12 | 18 | 24;

export type VisibilityMode = 'count-visible' | 'true-blind';

export type GameMode = 'online' | 'local';

export type MatchPhase = 'waiting' | 'playing' | 'gameover';

export interface CandyPiece {
  id: string;
  color: CandyColor;
}

export interface RoomSettings {
  lineLength: LineLength;
  visibilityMode: VisibilityMode;
}

export interface MoveRecord {
  id: string;
  turnNumber: number;
  callerId: string;
  callerName: string;
  defenderId: string;
  defenderName: string;
  calledColor: CandyColor;
  hit: boolean;
  /** Number of candies cleared; null when redacted in true-blind mode prior to gameover */
  clearedCount: number | null;
  timestamp: number;
}

export interface PendingClearState {
  callerId: string;
  callerName: string;
  defenderId: string;
  defenderName: string;
  calledColor: CandyColor;
  /** Candy IDs from bottom upward up to & including the first matching color */
  targetCandyIds: string[];
}

export interface ClientPendingClear {
  callerId: string;
  callerName: string;
  defenderId: string;
  defenderName: string;
  calledColor: CandyColor;
  /** Strictly null when viewer is NOT the defender (prevents peeking) */
  targetCandyIds: string[] | null;
}

export interface ServerPlayerState {
  id: string;
  token: string;
  name: string;
  seat: 0 | 1;
  connected: boolean;
  line: CandyPiece[];
  discarded: CandyPiece[];
  wantsRematch: boolean;
}

export interface ServerRoomState {
  code: string;
  hostId: string;
  phase: MatchPhase;
  settings: RoomSettings;
  players: [ServerPlayerState, ServerPlayerState | null];
  activeSeat: 0 | 1;
  pendingClear: PendingClearState | null;
  winnerId: string | null;
  turnNumber: number;
  goFishCount: number;
  moves: MoveRecord[];
  createdAt: number;
  updatedAt: number;
}

export interface ViewerSelfState {
  id: string;
  name: string;
  seat: 0 | 1;
  connected: boolean;
  line: CandyPiece[];
  discarded: CandyPiece[];
  remainingCount: number;
  wantsRematch: boolean;
}

export interface ViewerOpponentState {
  id: string;
  name: string;
  seat: 0 | 1;
  connected: boolean;
  /** Strictly null during 'playing'; revealed only when phase === 'gameover' */
  line: CandyPiece[] | null;
  /** Strictly null during 'playing'; revealed only when phase === 'gameover' */
  discarded: CandyPiece[] | null;
  /** Null when visibilityMode === 'true-blind' during 'playing' */
  remainingCount: number | null;
  wantsRematch: boolean;
}

export interface ClientMatchView {
  code: string;
  hostId: string;
  phase: MatchPhase;
  settings: RoomSettings;
  self: ViewerSelfState;
  opponent: ViewerOpponentState | null;
  activeSeat: 0 | 1;
  isMyTurn: boolean;
  pendingClear: ClientPendingClear | null;
  winnerId: string | null;
  turnNumber: number;
  goFishCount: number;
  moves: MoveRecord[];
  lastMove: MoveRecord | null;
}

export interface EmojiReactionPayload {
  id: string;
  senderId: string;
  senderName: string;
  emoji: string;
  label: string;
  timestamp: number;
}
