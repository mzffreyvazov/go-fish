import assert from 'node:assert/strict';
import test from 'node:test';
import { CANDY_COLORS } from './constants.ts';
import {
  applyColorCallToRoom,
  confirmClearInRoom,
  createInitialRoomState,
  generateCandyLine,
  resolveColorCall,
  sanitizeRoomForViewer,
  startMatchInRoom,
} from './rules.ts';
import type { CandyPiece, ServerRoomState } from './types.ts';

function makeLine(colors: CandyPiece['color'][]): CandyPiece[] {
  return colors.map((color, idx) => ({ id: `c-${idx}`, color }));
}

test('generateCandyLine produces exact length with valid candy colors', () => {
  for (const length of [12, 18, 24] as const) {
    const line = generateCandyLine(length);
    assert.equal(line.length, length);
    for (const piece of line) {
      assert.ok(CANDY_COLORS.includes(piece.color));
      assert.ok(piece.id.length > 0);
    }
  }
});

test('resolveColorCall clears from bottom upward to first matching candy', () => {
  const line = makeLine(['red', 'green', 'yellow', 'orange', 'purple']);

  const bottomHit = resolveColorCall(line, 'purple');
  assert.equal(bottomHit.hit, true);
  assert.equal(bottomHit.cleared.length, 1);
  assert.equal(bottomHit.cleared[0].color, 'purple');
  assert.deepEqual(
    bottomHit.remaining.map((c) => c.color),
    ['red', 'green', 'yellow', 'orange'],
  );

  const midHit = resolveColorCall(line, 'yellow');
  assert.equal(midHit.hit, true);
  assert.deepEqual(
    midHit.cleared.map((c) => c.color),
    ['purple', 'orange', 'yellow'],
  );
  assert.deepEqual(
    midHit.remaining.map((c) => c.color),
    ['red', 'green'],
  );

  const topHit = resolveColorCall(line, 'red');
  assert.equal(topHit.hit, true);
  assert.equal(topHit.cleared.length, 5);
  assert.equal(topHit.remaining.length, 0);
});

test('resolveColorCall clears only up to bottom-most duplicate when color repeats', () => {
  const line = makeLine(['green', 'red', 'green', 'orange']);
  const res = resolveColorCall(line, 'green');
  assert.equal(res.hit, true);
  assert.equal(res.cleared.length, 2);
  assert.deepEqual(
    res.remaining.map((c) => c.color),
    ['green', 'red'],
  );
});

test('resolveColorCall returns Go Fish miss when color is absent', () => {
  const line = makeLine(['red', 'orange', 'yellow']);
  const miss = resolveColorCall(line, 'purple');
  assert.equal(miss.hit, false);
  assert.equal(miss.cleared.length, 0);
  assert.equal(miss.remaining.length, 3);
});

test('applyColorCallToRoom enters pendingClear on HIT, waits for confirmClearInRoom, and wins at 0 candies', () => {
  let room = createInitialRoomState({
    code: 'TEST',
    hostId: 'p0',
    hostToken: 't0',
    hostName: 'Alex',
    settings: { lineLength: 12, visibilityMode: 'count-visible' },
  });
  room.players[1] = {
    id: 'p1',
    token: 't1',
    name: 'Sarah',
    seat: 1,
    connected: true,
    line: [],
    discarded: [],
    wantsRematch: false,
  };
  room = startMatchInRoom(room, () => 0.1, 1000, 0);
  room.players[0].line = makeLine(['red', 'green']);
  room.players[1]!.line = makeLine(['yellow', 'purple']);

  // P0 calls orange -> Go Fish! Turn moves immediately to P1
  const turn1 = applyColorCallToRoom(room, 'p0', 'orange', 2000);
  assert.equal(turn1.move?.hit, false);
  assert.equal(turn1.nextState.goFishCount, 1);
  assert.equal(turn1.nextState.activeSeat, 1);
  assert.equal(turn1.nextState.pendingClear, null);

  // P1 calls green -> HIT! Enters pendingClear without auto-removing P0's candy
  const turn2Hit = applyColorCallToRoom(turn1.nextState, 'p1', 'green', 3000);
  assert.equal(turn2Hit.move, null);
  assert.ok(turn2Hit.nextState.pendingClear);
  assert.equal(turn2Hit.nextState.pendingClear.defenderId, 'p0');
  assert.equal(turn2Hit.nextState.pendingClear.targetCandyIds.length, 1);
  assert.equal(turn2Hit.nextState.players[0].line.length, 2);

  // Only P0 (defender) can confirm clear by dragging to discard
  assert.throws(() => confirmClearInRoom(turn2Hit.nextState, 'p1', 3100));
  const turn2Confirmed = confirmClearInRoom(turn2Hit.nextState, 'p0', 3200);
  assert.equal(turn2Confirmed.move.clearedCount, 1);
  assert.equal(turn2Confirmed.nextState.players[0].line.length, 1);
  assert.equal(turn2Confirmed.nextState.pendingClear, null);
  assert.equal(turn2Confirmed.nextState.activeSeat, 0);

  // P0 calls yellow -> HIT on P1 -> P1 confirms clear -> 0 left -> P0 wins!
  const turn3Hit = applyColorCallToRoom(turn2Confirmed.nextState, 'p0', 'yellow', 4000);
  assert.equal(turn3Hit.nextState.pendingClear?.targetCandyIds.length, 2);
  const turn3Confirmed = confirmClearInRoom(turn3Hit.nextState, 'p1', 4200);
  assert.equal(turn3Confirmed.move.clearedCount, 2);
  assert.equal(turn3Confirmed.nextState.players[1]!.line.length, 0);
  assert.equal(turn3Confirmed.nextState.phase, 'gameover');
  assert.equal(turn3Confirmed.nextState.winnerId, 'p0');
});

test('sanitizeRoomForViewer hides pendingClear targets from caller and hides clearedCount for both players in true-blind mode', () => {
  const base: ServerRoomState = {
    code: 'BLND',
    hostId: 'p0',
    phase: 'playing',
    settings: { lineLength: 12, visibilityMode: 'true-blind' },
    players: [
      {
        id: 'p0',
        token: 't0',
        name: 'Alex',
        seat: 0,
        connected: true,
        line: makeLine(['red', 'orange']),
        discarded: [],
        wantsRematch: false,
      },
      {
        id: 'p1',
        token: 't1',
        name: 'Sarah',
        seat: 1,
        connected: true,
        line: makeLine(['yellow', 'green', 'purple']),
        discarded: [],
        wantsRematch: false,
      },
    ],
    activeSeat: 0,
    pendingClear: null,
    winnerId: null,
    turnNumber: 0,
    goFishCount: 0,
    moves: [],
    createdAt: 1000,
    updatedAt: 1000,
  };

  // P0 calls green -> pendingClear on P1
  const { nextState: pendingState } = applyColorCallToRoom(base, 'p0', 'green', 2000);

  // Caller (P0) cannot see which/how many candies P1 is highlighting
  const p0PendingView = sanitizeRoomForViewer(pendingState, 'p0');
  assert.equal(p0PendingView.pendingClear?.targetCandyIds, null);
  assert.equal(p0PendingView.isMyTurn, false);

  // Defender (P1) sees exact targetCandyIds to drag
  const p1PendingView = sanitizeRoomForViewer(pendingState, 'p1');
  assert.equal(p1PendingView.pendingClear?.targetCandyIds?.length, 2);

  // P1 confirms drag to discard
  const { nextState: midMatch } = confirmClearInRoom(pendingState, 'p1', 2500);

  // In true-blind mode, BOTH P0 and P1 see clearedCount: null in Recent Calls while playing
  const p0View = sanitizeRoomForViewer(midMatch, 'p0');
  const p1View = sanitizeRoomForViewer(midMatch, 'p1');
  assert.equal(p0View.opponent?.line, null);
  assert.equal(p0View.opponent?.remainingCount, null);
  assert.equal(p0View.moves[0].clearedCount, null);
  assert.equal(p1View.moves[0].clearedCount, null);
  assert.equal(p1View.self.line.length, 1);

  // After P1 calls red -> P0 confirms -> gameover reveals all counts and lines
  const { nextState: winPending } = applyColorCallToRoom(midMatch, 'p1', 'red', 3000);
  const { nextState: endMatch } = confirmClearInRoom(winPending, 'p0', 3200);
  assert.equal(endMatch.phase, 'gameover');
  const endViewP0 = sanitizeRoomForViewer(endMatch, 'p0');
  assert.equal(endViewP0.opponent?.line?.length, 1);
  assert.equal(endViewP0.opponent?.discarded?.length, 2);
  assert.equal(endViewP0.opponent?.remainingCount, 1);
  assert.equal(endViewP0.moves[0].clearedCount, 2);
});
