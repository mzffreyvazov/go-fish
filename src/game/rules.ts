import { CANDY_COLORS } from './constants.ts';
import type {
  CandyColor,
  CandyPiece,
  ClientMatchView,
  LineLength,
  MoveRecord,
  RoomSettings,
  ServerPlayerState,
  ServerRoomState,
} from './types.ts';

/**
 * Generates a vertical candy line of length N.
 * Index 0 is the TOP of the line; index N - 1 is the BOTTOM of the line
 * (where clearing begins).
 */
export function generateCandyLine(
  length: LineLength,
  rng: () => number = Math.random,
  idPrefix = 'candy',
): CandyPiece[] {
  const pieces: CandyPiece[] = [];
  for (let i = 0; i < length; i += 1) {
    const colorIdx = Math.min(
      CANDY_COLORS.length - 1,
      Math.floor(rng() * CANDY_COLORS.length),
    );
    pieces.push({
      id: `${idPrefix}-${i}-${Math.floor(rng() * 1_000_000)}`,
      color: CANDY_COLORS[colorIdx],
    });
  }
  return pieces;
}

export interface CallResolution {
  hit: boolean;
  /** Candies cleared in bottom-to-top order (first cleared = bottom-most) */
  cleared: CandyPiece[];
  /** Remaining candies from top (index 0) to bottom (index length - 1) */
  remaining: CandyPiece[];
  /** Indices in the original defenderLine that were cleared */
  clearedIndices: number[];
}

/**
 * Resolves a color call against a defender's vertical candy line.
 * Always scans from the BOTTOM end (last element) upward, removing all
 * candies from the bottom up to and including the first candy matching `calledColor`.
 */
export function resolveColorCall(
  defenderLine: readonly CandyPiece[],
  calledColor: CandyColor,
): CallResolution {
  let matchIndex = -1;
  for (let i = defenderLine.length - 1; i >= 0; i -= 1) {
    if (defenderLine[i].color === calledColor) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex === -1) {
    return {
      hit: false,
      cleared: [],
      remaining: [...defenderLine],
      clearedIndices: [],
    };
  }

  const remaining = defenderLine.slice(0, matchIndex);
  // Bottom-most candies leave first into discard
  const cleared = defenderLine.slice(matchIndex).reverse();
  const clearedIndices: number[] = [];
  for (let i = defenderLine.length - 1; i >= matchIndex; i -= 1) {
    clearedIndices.push(i);
  }

  return {
    hit: true,
    cleared,
    remaining,
    clearedIndices,
  };
}

export interface ApplyTurnResult {
  nextState: ServerRoomState;
  move: MoveRecord | null;
  resolution: CallResolution;
}

/**
 * Step 1 of a turn: active player calls a color.
 * - On MISS ("Go Fish!"), immediately records move and passes turn to defender.
 * - On HIT, enters `pendingClear` state so the defender highlights and drags
 *   the matching candies from the bottom upward into their discard pile.
 */
export function applyColorCallToRoom(
  room: ServerRoomState,
  callerId: string,
  calledColor: CandyColor,
  now: number = Date.now(),
): ApplyTurnResult {
  if (room.phase !== 'playing') {
    throw new Error('Match is not currently active.');
  }
  if (room.pendingClear !== null) {
    throw new Error('Waiting for defender to clear highlighted candies.');
  }

  const p0 = room.players[0];
  const p1 = room.players[1];
  if (!p1) {
    throw new Error('Opponent has not joined yet.');
  }

  const activePlayer = room.activeSeat === 0 ? p0 : p1;
  const defender = room.activeSeat === 0 ? p1 : p0;

  if (activePlayer.id !== callerId) {
    throw new Error('It is not your turn.');
  }

  const resolution = resolveColorCall(defender.line, calledColor);

  if (resolution.hit) {
    const nextState: ServerRoomState = {
      ...room,
      pendingClear: {
        callerId: activePlayer.id,
        callerName: activePlayer.name,
        defenderId: defender.id,
        defenderName: defender.name,
        calledColor,
        targetCandyIds: resolution.cleared.map((c) => c.id),
      },
      updatedAt: now,
    };
    return {
      nextState,
      move: null,
      resolution,
    };
  }

  // Miss ("Go Fish!") completes the turn immediately
  const nextTurnNumber = room.turnNumber + 1;
  const move: MoveRecord = {
    id: `move-${nextTurnNumber}-${now}`,
    turnNumber: nextTurnNumber,
    callerId: activePlayer.id,
    callerName: activePlayer.name,
    defenderId: defender.id,
    defenderName: defender.name,
    calledColor,
    hit: false,
    clearedCount: 0,
    timestamp: now,
  };

  const nextState: ServerRoomState = {
    ...room,
    activeSeat: defender.seat,
    turnNumber: nextTurnNumber,
    goFishCount: room.goFishCount + 1,
    moves: [...room.moves, move],
    updatedAt: now,
  };

  return {
    nextState,
    move,
    resolution,
  };
}

/**
 * Step 2 of a HIT turn: defender drags the highlighted candies into their discard pile.
 */
export function confirmClearInRoom(
  room: ServerRoomState,
  defenderId: string,
  now: number = Date.now(),
): { nextState: ServerRoomState; move: MoveRecord; resolution: CallResolution } {
  if (room.phase !== 'playing') {
    throw new Error('Match is not currently active.');
  }
  if (!room.pendingClear) {
    throw new Error('There are no candies waiting to be cleared.');
  }
  if (room.pendingClear.defenderId !== defenderId) {
    throw new Error('Only the defending player can clear their candies.');
  }

  const p0 = room.players[0];
  const p1 = room.players[1];
  if (!p1) {
    throw new Error('Opponent has not joined yet.');
  }

  const caller = p0.id === room.pendingClear.callerId ? p0 : p1;
  const defender = p0.id === defenderId ? p0 : p1;

  const resolution = resolveColorCall(defender.line, room.pendingClear.calledColor);
  if (!resolution.hit) {
    throw new Error('No matching candies found to clear.');
  }

  const nextTurnNumber = room.turnNumber + 1;
  const updatedDefender: ServerPlayerState = {
    ...defender,
    line: resolution.remaining,
    discarded: [...defender.discarded, ...resolution.cleared],
  };

  const move: MoveRecord = {
    id: `move-${nextTurnNumber}-${now}`,
    turnNumber: nextTurnNumber,
    callerId: caller.id,
    callerName: caller.name,
    defenderId: defender.id,
    defenderName: defender.name,
    calledColor: room.pendingClear.calledColor,
    hit: true,
    clearedCount: resolution.cleared.length,
    timestamp: now,
  };

  const defenderEmptied = updatedDefender.line.length === 0;
  const nextPhase = defenderEmptied ? 'gameover' : 'playing';
  const nextWinnerId = defenderEmptied ? caller.id : null;
  const nextActiveSeat: 0 | 1 = defenderEmptied ? caller.seat : defender.seat;

  const nextPlayers: [ServerPlayerState, ServerPlayerState] =
    defender.seat === 0 ? [updatedDefender, caller] : [caller, updatedDefender];

  const nextState: ServerRoomState = {
    ...room,
    phase: nextPhase,
    players: nextPlayers,
    activeSeat: nextActiveSeat,
    pendingClear: null,
    winnerId: nextWinnerId,
    turnNumber: nextTurnNumber,
    moves: [...room.moves, move],
    updatedAt: now,
  };

  return {
    nextState,
    move,
    resolution,
  };
}

/**
 * Creates a fresh match state for two players (initial start or rematch).
 */
export function startMatchInRoom(
  room: ServerRoomState,
  rng: () => number = Math.random,
  now: number = Date.now(),
  startingSeat?: 0 | 1,
): ServerRoomState {
  const p0 = room.players[0];
  const p1 = room.players[1];
  if (!p1) {
    throw new Error('Cannot start match without two players.');
  }

  const firstSeat: 0 | 1 =
    startingSeat !== undefined ? startingSeat : rng() < 0.5 ? 0 : 1;

  return {
    ...room,
    phase: 'playing',
    activeSeat: firstSeat,
    pendingClear: null,
    winnerId: null,
    turnNumber: 0,
    goFishCount: 0,
    moves: [],
    updatedAt: now,
    players: [
      {
        ...p0,
        line: generateCandyLine(room.settings.lineLength, rng, `p0-${now}`),
        discarded: [],
        wantsRematch: false,
      },
      {
        ...p1,
        line: generateCandyLine(room.settings.lineLength, rng, `p1-${now}`),
        discarded: [],
        wantsRematch: false,
      },
    ],
  };
}

/**
 * Redacts hidden opponent data before sending room state to any client.
 * Guarantees opponent's line, discard pile, pending highlight targets, and
 * true-blind move cleared counts cannot be inspected prior to gameover.
 */
export function sanitizeRoomForViewer(
  room: ServerRoomState,
  viewerId: string,
): ClientMatchView {
  const p0 = room.players[0];
  const p1 = room.players[1];

  const isP0 = p0.id === viewerId;
  const selfPlayer = isP0 ? p0 : p1;
  if (!selfPlayer) {
    throw new Error('Viewer is not a participant in this room.');
  }
  const opponentPlayer = isP0 ? p1 : p0;

  const isGameOver = room.phase === 'gameover';
  const isTrueBlind = room.settings.visibilityMode === 'true-blind';

  // In true-blind mode during active play, redact clearedCount on ALL hit moves
  // so both players see consistent, mystery-preserving Recent Calls logs.
  const sanitizedMoves: MoveRecord[] = room.moves.map((m) => {
    if (isGameOver || !isTrueBlind || !m.hit) {
      return m;
    }
    return {
      ...m,
      clearedCount: null,
    };
  });

  const lastMove =
    sanitizedMoves.length > 0 ? sanitizedMoves[sanitizedMoves.length - 1] : null;

  const sanitizedPendingClear = room.pendingClear
    ? {
        callerId: room.pendingClear.callerId,
        callerName: room.pendingClear.callerName,
        defenderId: room.pendingClear.defenderId,
        defenderName: room.pendingClear.defenderName,
        calledColor: room.pendingClear.calledColor,
        targetCandyIds:
          room.pendingClear.defenderId === viewerId || isGameOver
            ? [...room.pendingClear.targetCandyIds]
            : null,
      }
    : null;

  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    settings: { ...room.settings },
    self: {
      id: selfPlayer.id,
      name: selfPlayer.name,
      seat: selfPlayer.seat,
      connected: selfPlayer.connected,
      line: [...selfPlayer.line],
      discarded: [...selfPlayer.discarded],
      remainingCount: selfPlayer.line.length,
      wantsRematch: selfPlayer.wantsRematch,
    },
    opponent: opponentPlayer
      ? {
          id: opponentPlayer.id,
          name: opponentPlayer.name,
          seat: opponentPlayer.seat,
          connected: opponentPlayer.connected,
          line: isGameOver ? [...opponentPlayer.line] : null,
          discarded: isGameOver ? [...opponentPlayer.discarded] : null,
          remainingCount:
            isGameOver || !isTrueBlind ? opponentPlayer.line.length : null,
          wantsRematch: opponentPlayer.wantsRematch,
        }
      : null,
    activeSeat: room.activeSeat,
    isMyTurn:
      room.phase === 'playing' &&
      room.pendingClear === null &&
      room.activeSeat === selfPlayer.seat,
    pendingClear: sanitizedPendingClear,
    winnerId: room.winnerId,
    turnNumber: room.turnNumber,
    goFishCount: room.goFishCount,
    moves: sanitizedMoves,
    lastMove,
  };
}

export function createInitialRoomState(params: {
  code: string;
  hostId: string;
  hostToken: string;
  hostName: string;
  settings: RoomSettings;
  now?: number;
}): ServerRoomState {
  const now = params.now ?? Date.now();
  return {
    code: params.code,
    hostId: params.hostId,
    phase: 'waiting',
    settings: { ...params.settings },
    players: [
      {
        id: params.hostId,
        token: params.hostToken,
        name: params.hostName,
        seat: 0,
        connected: true,
        line: [],
        discarded: [],
        wantsRematch: false,
      },
      null,
    ],
    activeSeat: 0,
    pendingClear: null,
    winnerId: null,
    turnNumber: 0,
    goFishCount: 0,
    moves: [],
    createdAt: now,
    updatedAt: now,
  };
}
