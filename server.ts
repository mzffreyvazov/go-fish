import express from 'express';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { CANDY_COLORS } from './src/game/constants.ts';
import {
  applyColorCallToRoom,
  confirmClearInRoom,
  createInitialRoomState,
  sanitizeRoomForViewer,
  startMatchInRoom,
} from './src/game/rules.ts';
import type {
  CandyColor,
  EmojiReactionPayload,
  RoomSettings,
  ServerRoomState,
} from './src/game/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD =
  process.env.NODE_ENV === 'production' ||
  process.env.RENDER === 'true' ||
  Boolean(process.env.RAILWAY_ENVIRONMENT);

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

function generateRoomCode(existing: Map<string, ServerRoomState>): string {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    let code = '';
    for (let i = 0; i < 5; i += 1) {
      code += ROOM_CODE_ALPHABET[crypto.randomInt(ROOM_CODE_ALPHABET.length)];
    }
    if (!existing.has(code)) {
      return code;
    }
  }
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function normalizeSettings(input?: Partial<RoomSettings>): RoomSettings {
  const validLengths = new Set([12, 18, 24]);
  const lineLength =
    input?.lineLength && validLengths.has(input.lineLength) ? input.lineLength : 18;
  const visibilityMode =
    input?.visibilityMode === 'count-visible' ? 'count-visible' : 'true-blind';
  return { lineLength, visibilityMode };
}

function sanitizeName(name: unknown, fallback: string): string {
  if (typeof name !== 'string') return fallback;
  const trimmed = name.trim().slice(0, 18);
  return trimmed.length > 0 ? trimmed : fallback;
}

async function bootstrap() {
  const app = express();
  const httpServer = http.createServer(app);
  const allowedOrigin = process.env.CLIENT_ORIGIN?.trim();
  const io = new Server(httpServer, {
    cors: {
      origin:
        allowedOrigin && allowedOrigin !== '*'
          ? allowedOrigin.split(',').map((s) => s.trim())
          : '*',
    },
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  const rooms = new Map<string, ServerRoomState>();
  // Map socket.id -> { code, playerId }
  const socketToMember = new Map<string, { code: string; playerId: string }>();

  // Periodic stale room cleanup
  setInterval(() => {
    const cutoff = Date.now() - ROOM_TTL_MS;
    for (const [code, room] of rooms.entries()) {
      if (room.updatedAt < cutoff) {
        rooms.delete(code);
      }
    }
  }, 60_000 * 10);

  function emitSanitizedRoomToPlayers(room: ServerRoomState) {
    for (const [socketId, member] of socketToMember.entries()) {
      if (member.code !== room.code) continue;
      const targetSocket = io.sockets.sockets.get(socketId);
      if (!targetSocket) continue;
      try {
        const view = sanitizeRoomForViewer(room, member.playerId);
        targetSocket.emit('room:state', view);
      } catch {
        // Ignore stale membership
      }
    }
  }

  function findPlayerByToken(room: ServerRoomState, token: unknown) {
    if (typeof token !== 'string' || !token) return null;
    if (room.players[0].token === token) return room.players[0];
    if (room.players[1] && room.players[1].token === token) return room.players[1];
    return null;
  }

  io.on('connection', (socket) => {
    socket.on(
      'room:create',
      (
        payload: {
          playerName?: string;
          playerToken?: string;
          settings?: Partial<RoomSettings>;
        },
        ack?: (res: Record<string, unknown>) => void,
      ) => {
        const code = generateRoomCode(rooms);
        const hostId = `p-${crypto.randomUUID()}`;
        const hostToken =
          typeof payload?.playerToken === 'string' && payload.playerToken.length > 0
            ? payload.playerToken
            : crypto.randomUUID();
        const hostName = sanitizeName(payload?.playerName, 'Player 1');
        const settings = normalizeSettings(payload?.settings);

        const room = createInitialRoomState({
          code,
          hostId,
          hostToken,
          hostName,
          settings,
        });
        rooms.set(code, room);

        socket.join(code);
        socketToMember.set(socket.id, { code, playerId: hostId });

        const view = sanitizeRoomForViewer(room, hostId);
        ack?.({ ok: true, code, playerId: hostId, playerToken: hostToken, state: view });
      },
    );

    socket.on(
      'room:join',
      (
        payload: {
          code?: string;
          playerName?: string;
          playerToken?: string;
        },
        ack?: (res: Record<string, unknown>) => void,
      ) => {
        const rawCode = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : '';
        const room = rooms.get(rawCode);
        if (!room) {
          ack?.({ ok: false, error: 'Room not found. Double-check the room code.' });
          return;
        }

        // Check if reconnecting by token
        const existing = findPlayerByToken(room, payload?.playerToken);
        if (existing) {
          existing.connected = true;
          room.updatedAt = Date.now();
          socket.join(room.code);
          socketToMember.set(socket.id, { code: room.code, playerId: existing.id });
          const view = sanitizeRoomForViewer(room, existing.id);
          emitSanitizedRoomToPlayers(room);
          ack?.({
            ok: true,
            code: room.code,
            playerId: existing.id,
            playerToken: existing.token,
            state: view,
          });
          return;
        }

        if (room.players[1] !== null) {
          ack?.({ ok: false, error: 'This room already has two players.' });
          return;
        }

        const guestId = `p-${crypto.randomUUID()}`;
        const guestToken =
          typeof payload?.playerToken === 'string' && payload.playerToken.length > 0
            ? payload.playerToken
            : crypto.randomUUID();
        const guestName = sanitizeName(payload?.playerName, 'Player 2');

        room.players[1] = {
          id: guestId,
          token: guestToken,
          name: guestName,
          seat: 1,
          connected: true,
          line: [],
          discarded: [],
          wantsRematch: false,
        };
        room.updatedAt = Date.now();

        socket.join(room.code);
        socketToMember.set(socket.id, { code: room.code, playerId: guestId });

        const view = sanitizeRoomForViewer(room, guestId);
        emitSanitizedRoomToPlayers(room);
        ack?.({
          ok: true,
          code: room.code,
          playerId: guestId,
          playerToken: guestToken,
          state: view,
        });
      },
    );

    socket.on(
      'room:settings',
      (
        payload: {
          code?: string;
          playerToken?: string;
          settings?: Partial<RoomSettings>;
        },
        ack?: (res: Record<string, unknown>) => void,
      ) => {
        const code = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : '';
        const room = rooms.get(code);
        if (!room) {
          ack?.({ ok: false, error: 'Room not found.' });
          return;
        }
        const player = findPlayerByToken(room, payload?.playerToken);
        if (!player || player.id !== room.hostId) {
          ack?.({ ok: false, error: 'Only the room host can update settings.' });
          return;
        }
        if (room.phase !== 'waiting') {
          ack?.({ ok: false, error: 'Settings can only be changed before the match starts.' });
          return;
        }
        room.settings = normalizeSettings(payload?.settings);
        room.updatedAt = Date.now();
        emitSanitizedRoomToPlayers(room);
        ack?.({ ok: true });
      },
    );

    socket.on(
      'room:start',
      (
        payload: { code?: string; playerToken?: string },
        ack?: (res: Record<string, unknown>) => void,
      ) => {
        const code = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : '';
        const room = rooms.get(code);
        if (!room) {
          ack?.({ ok: false, error: 'Room not found.' });
          return;
        }
        const player = findPlayerByToken(room, payload?.playerToken);
        if (!player || player.id !== room.hostId) {
          ack?.({ ok: false, error: 'Only the room host can start the match.' });
          return;
        }
        if (!room.players[1]) {
          ack?.({ ok: false, error: 'Waiting for a second player to join.' });
          return;
        }

        const started = startMatchInRoom(room);
        rooms.set(code, started);
        emitSanitizedRoomToPlayers(started);
        ack?.({ ok: true });
      },
    );

    socket.on(
      'game:call',
      (
        payload: { code?: string; playerToken?: string; color?: CandyColor },
        ack?: (res: Record<string, unknown>) => void,
      ) => {
        const code = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : '';
        const room = rooms.get(code);
        if (!room) {
          ack?.({ ok: false, error: 'Room not found.' });
          return;
        }
        const player = findPlayerByToken(room, payload?.playerToken);
        if (!player) {
          ack?.({ ok: false, error: 'Player not found in room.' });
          return;
        }
        if (!payload?.color || !CANDY_COLORS.includes(payload.color)) {
          ack?.({ ok: false, error: 'Invalid candy color.' });
          return;
        }

        try {
          const { nextState } = applyColorCallToRoom(room, player.id, payload.color);
          rooms.set(code, nextState);
          emitSanitizedRoomToPlayers(nextState);
          ack?.({ ok: true });
        } catch (err) {
          ack?.({
            ok: false,
            error: err instanceof Error ? err.message : 'Unable to process move.',
          });
        }
      },
    );

    socket.on(
      'game:confirmClear',
      (
        payload: { code?: string; playerToken?: string },
        ack?: (res: Record<string, unknown>) => void,
      ) => {
        const code = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : '';
        const room = rooms.get(code);
        if (!room) {
          ack?.({ ok: false, error: 'Room not found.' });
          return;
        }
        const player = findPlayerByToken(room, payload?.playerToken);
        if (!player) {
          ack?.({ ok: false, error: 'Player not found in room.' });
          return;
        }

        try {
          const { nextState } = confirmClearInRoom(room, player.id);
          rooms.set(code, nextState);
          emitSanitizedRoomToPlayers(nextState);
          ack?.({ ok: true });
        } catch (err) {
          ack?.({
            ok: false,
            error: err instanceof Error ? err.message : 'Unable to clear candies.',
          });
        }
      },
    );

    socket.on(
      'game:rematch',
      (
        payload: { code?: string; playerToken?: string },
        ack?: (res: Record<string, unknown>) => void,
      ) => {
        const code = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : '';
        const room = rooms.get(code);
        if (!room) {
          ack?.({ ok: false, error: 'Room not found.' });
          return;
        }
        const player = findPlayerByToken(room, payload?.playerToken);
        if (!player) {
          ack?.({ ok: false, error: 'Player not found in room.' });
          return;
        }
        if (room.phase !== 'gameover' || !room.players[1]) {
          ack?.({ ok: false, error: 'Match is not finished yet.' });
          return;
        }

        player.wantsRematch = true;
        room.updatedAt = Date.now();

        if (room.players[0].wantsRematch && room.players[1].wantsRematch) {
          const nextStartingSeat: 0 | 1 = room.activeSeat === 0 ? 1 : 0;
          const restarted = startMatchInRoom(room, Math.random, Date.now(), nextStartingSeat);
          rooms.set(code, restarted);
          emitSanitizedRoomToPlayers(restarted);
        } else {
          emitSanitizedRoomToPlayers(room);
        }
        ack?.({ ok: true });
      },
    );

    socket.on(
      'game:reaction',
      (payload: { code?: string; playerToken?: string; emoji?: string; label?: string }) => {
        const code = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : '';
        const room = rooms.get(code);
        if (!room) return;
        const player = findPlayerByToken(room, payload?.playerToken);
        if (!player) return;
        if (typeof payload?.emoji !== 'string' || payload.emoji.length > 8) return;

        const reaction: EmojiReactionPayload = {
          id: `rx-${crypto.randomUUID()}`,
          senderId: player.id,
          senderName: player.name,
          emoji: payload.emoji,
          label: typeof payload.label === 'string' ? payload.label.slice(0, 20) : '',
          timestamp: Date.now(),
        };
        io.to(room.code).emit('room:reaction', reaction);
      },
    );

    socket.on('room:leave', () => {
      const member = socketToMember.get(socket.id);
      if (!member) return;
      const room = rooms.get(member.code);
      socket.leave(member.code);
      socketToMember.delete(socket.id);
      if (!room) return;
      const target =
        room.players[0].id === member.playerId
          ? room.players[0]
          : room.players[1]?.id === member.playerId
            ? room.players[1]
            : null;
      if (target) {
        target.connected = false;
        room.updatedAt = Date.now();
        emitSanitizedRoomToPlayers(room);
      }
    });

    socket.on('disconnect', () => {
      const member = socketToMember.get(socket.id);
      if (!member) return;
      socketToMember.delete(socket.id);
      const room = rooms.get(member.code);
      if (!room) return;

      // Only mark disconnected if no other active socket holds this playerId
      let stillConnected = false;
      for (const other of socketToMember.values()) {
        if (other.code === member.code && other.playerId === member.playerId) {
          stillConnected = true;
          break;
        }
      }
      if (!stillConnected) {
        const target =
          room.players[0].id === member.playerId
            ? room.players[0]
            : room.players[1]?.id === member.playerId
              ? room.players[1]
              : null;
        if (target) {
          target.connected = false;
          room.updatedAt = Date.now();
          emitSanitizedRoomToPlayers(room);
        }
      }
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Candy Line: Go Fish server listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
