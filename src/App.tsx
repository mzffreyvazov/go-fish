import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Check, Copy, Eye, EyeOff, HelpCircle, LogOut, Volume2, VolumeX } from 'lucide-react';
import { REACTION_PRESETS } from './game/constants.ts';
import {
  applyColorCallToRoom,
  confirmClearInRoom,
  createInitialRoomState,
  sanitizeRoomForViewer,
  startMatchInRoom,
} from './game/rules.ts';
import type {
  CandyColor,
  ClientMatchView,
  EmojiReactionPayload,
  GameMode,
  RoomSettings,
  ServerRoomState,
} from './game/types.ts';
import { soundEngine } from './utils/sound.ts';
import { ColorPickerBar } from './components/ColorPickerBar.tsx';
import { GameOverBanner } from './components/GameOverBanner.tsx';
import { GoFishOverlay } from './components/GoFishOverlay.tsx';
import { LobbyScreen } from './components/LobbyScreen.tsx';
import { MoveHistoryLog } from './components/MoveHistoryLog.tsx';
import { PassDeviceCurtain } from './components/PassDeviceCurtain.tsx';
import { RulesModal } from './components/RulesModal.tsx';
import { TabletopBoard } from './components/TabletopBoard.tsx';
import { WaitingRoom } from './components/WaitingRoom.tsx';

const MARBLE_BG_URL = '/src/assets/images/tabletop_marble_1794936023210.jpg';

function getOrCreatePlayerToken(): string {
  if (typeof window === 'undefined') return 'token-ssr';
  const key = 'candy_line_player_token';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const fresh =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `tok-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  window.sessionStorage.setItem(key, fresh);
  return fresh;
}

function buildLocalMatch(
  p1Name: string,
  p2Name: string,
  settings: RoomSettings,
): ServerRoomState {
  const base = createInitialRoomState({
    code: 'LOCAL',
    hostId: 'local-p0',
    hostToken: 'local-t0',
    hostName: p1Name,
    settings,
  });
  base.players[1] = {
    id: 'local-p1',
    token: 'local-t1',
    name: p2Name,
    seat: 1,
    connected: true,
    line: [],
    discarded: [],
    wantsRematch: false,
  };
  return startMatchInRoom(base, Math.random, Date.now(), 0);
}

export default function App() {
  const initialQuery = useMemo(() => {
    if (typeof window === 'undefined') {
      return { roomCode: '', autostart: false };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      roomCode: (params.get('room') ?? '').trim().toUpperCase(),
      autostart: params.get('autostart') === '1',
    };
  }, []);

  const [mode, setMode] = useState<GameMode>(
    initialQuery.autostart ? 'local' : 'online',
  );
  const [onlineMatch, setOnlineMatch] = useState<ClientMatchView | null>(null);
  const [localRoom, setLocalRoom] = useState<ServerRoomState | null>(() =>
    initialQuery.autostart
      ? buildLocalMatch('Player 1', 'Player 2', {
          lineLength: 18,
          visibilityMode: 'true-blind',
        })
      : null,
  );
  const [localCurtainVisible, setLocalCurtainVisible] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showColorblindLabels, setShowColorblindLabels] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [reactions, setReactions] = useState<EmojiReactionPayload[]>([]);
  const [goFishFlashKey, setGoFishFlashKey] = useState(0);
  const [marbleLoadFailed, setMarbleLoadFailed] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const playerTokenRef = useRef<string>(getOrCreatePlayerToken());
  const prevTurnCountRef = useRef<number>(0);
  const prevPhaseRef = useRef<string>('title');

  // Derive active ClientMatchView cleanly for both online and local modes.
  // In Local mode, if pendingClear is active, the defending player holds the device!
  const activeMatch: ClientMatchView | null = useMemo(() => {
    if (mode === 'online') return onlineMatch;
    if (!localRoom) return null;
    const viewerId = localRoom.pendingClear
      ? localRoom.pendingClear.defenderId
      : (localRoom.activeSeat === 0 ? localRoom.players[0] : localRoom.players[1]!).id;
    return sanitizeRoomForViewer(localRoom, viewerId);
  }, [mode, onlineMatch, localRoom]);

  // Keep body data-state synced for accessibility and automated verification
  useEffect(() => {
    if (!activeMatch || activeMatch.phase === 'waiting') {
      document.body.dataset.state = 'title';
    } else if (activeMatch.phase === 'gameover') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [activeMatch]);

  useEffect(() => {
    soundEngine.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Trigger move sound effects and Go Fish toast when turn advances
  useEffect(() => {
    if (!activeMatch) {
      prevTurnCountRef.current = 0;
      prevPhaseRef.current = 'title';
      return;
    }

    if (activeMatch.turnNumber > prevTurnCountRef.current && activeMatch.lastMove) {
      if (activeMatch.lastMove.hit) {
        soundEngine.playCandyPop(activeMatch.lastMove.clearedCount ?? 2);
      } else {
        soundEngine.playGoFish();
        setGoFishFlashKey((k) => k + 1);
      }
    }
    prevTurnCountRef.current = activeMatch.turnNumber;

    if (activeMatch.phase === 'gameover' && prevPhaseRef.current !== 'gameover') {
      soundEngine.playDividerLift();
      if (activeMatch.winnerId === activeMatch.self.id) {
        setTimeout(() => soundEngine.playVictoryFanfare(), 220);
      } else if (mode === 'online') {
        setTimeout(() => soundEngine.playDefeatTone(), 220);
      } else {
        setTimeout(() => soundEngine.playVictoryFanfare(), 220);
      }
    }
    prevPhaseRef.current = activeMatch.phase;
  }, [activeMatch, mode]);

  // Auto-hide Go Fish overlay after 1.9s
  useEffect(() => {
    if (goFishFlashKey === 0) return;
    const timer = window.setTimeout(() => {
      setGoFishFlashKey(0);
    }, 1900);
    return () => window.clearTimeout(timer);
  }, [goFishFlashKey]);

  const ensureSocket = useCallback((): Socket => {
    if (socketRef.current) {
      if (!socketRef.current.connected) {
        socketRef.current.connect();
      }
      return socketRef.current;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL?.trim() || undefined;
    const sock = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 7000,
    });

    sock.on('room:state', (view: ClientMatchView) => {
      setOnlineMatch(view);
      setErrorMessage(null);
    });

    sock.on('room:reaction', (rx: EmojiReactionPayload) => {
      setReactions((prev) => [...prev.slice(-3), rx]);
      window.setTimeout(() => {
        setReactions((prev) => prev.filter((item) => item.id !== rx.id));
      }, 2800);
    });

    socketRef.current = sock;
    return sock;
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emitRoomAction = useCallback(
    <T extends { ok?: boolean; state?: ClientMatchView; error?: string }>(
      sock: Socket,
      event: string,
      payload: Record<string, unknown>,
      fallbackError: string,
    ): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        let settled = false;
        const finishError = (err: Error) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          sock.off('connect_error', onConnectError);
          reject(err);
        };

        const onConnectError = () => {
          finishError(
            new Error(
              'Unable to reach the multiplayer WebSocket server. If deployed on Vercel, set VITE_SOCKET_URL to a Node/Socket.io backend (e.g. Render or Railway) or host the full app on a Node.js server.',
            ),
          );
        };

        const timer = window.setTimeout(() => {
          finishError(
            new Error(
              'Connection to the multiplayer server timed out. Check your server or try Local Pass & Play.',
            ),
          );
        }, 7000);

        if (!sock.connected) {
          sock.once('connect_error', onConnectError);
        }

        sock.emit(event, payload, (res: T) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          sock.off('connect_error', onConnectError);
          if (res?.ok) {
            resolve(res);
          } else {
            reject(new Error(res?.error ?? fallbackError));
          }
        });
      });
    },
    [],
  );

  const handleCreateOnlineRoom = useCallback(
    async (playerName: string, settings: RoomSettings) => {
      setBusy(true);
      setErrorMessage(null);
      try {
        const sock = ensureSocket();
        const res = await emitRoomAction<{
          ok?: boolean;
          state?: ClientMatchView;
          error?: string;
        }>(
          sock,
          'room:create',
          {
            playerName,
            playerToken: playerTokenRef.current,
            settings,
          },
          'Could not create room.',
        );
        if (res.state) {
          setMode('online');
          setOnlineMatch(res.state);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Connection failed.');
      } finally {
        setBusy(false);
      }
    },
    [ensureSocket, emitRoomAction],
  );

  const handleJoinOnlineRoom = useCallback(
    async (code: string, playerName: string) => {
      setBusy(true);
      setErrorMessage(null);
      try {
        const sock = ensureSocket();
        const res = await emitRoomAction<{
          ok?: boolean;
          state?: ClientMatchView;
          error?: string;
        }>(
          sock,
          'room:join',
          {
            code,
            playerName,
            playerToken: playerTokenRef.current,
          },
          'Could not join room.',
        );
        if (res.state) {
          setMode('online');
          setOnlineMatch(res.state);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Unable to join room.');
      } finally {
        setBusy(false);
      }
    },
    [ensureSocket, emitRoomAction],
  );

  const handleStartLocalMatch = useCallback(
    (p1Name: string, p2Name: string, settings: RoomSettings) => {
      setErrorMessage(null);
      setMode('local');
      setOnlineMatch(null);
      const room = buildLocalMatch(p1Name, p2Name, settings);
      setLocalRoom(room);
      setLocalCurtainVisible(true);
    },
    [],
  );

  const handleUpdateSettings = useCallback(
    (settings: RoomSettings) => {
      const sock = socketRef.current;
      if (!sock || !onlineMatch) return;
      sock.emit(
        'room:settings',
        {
          code: onlineMatch.code,
          playerToken: playerTokenRef.current,
          settings,
        },
        (res: { ok?: boolean; error?: string }) => {
          if (!res?.ok && res?.error) {
            setErrorMessage(res.error);
          }
        },
      );
    },
    [onlineMatch],
  );

  const handleStartOnlineMatch = useCallback(() => {
    const sock = socketRef.current;
    if (!sock || !onlineMatch) return;
    sock.emit(
      'room:start',
      {
        code: onlineMatch.code,
        playerToken: playerTokenRef.current,
      },
      (res: { ok?: boolean; error?: string }) => {
        if (!res?.ok && res?.error) {
          setErrorMessage(res.error);
        }
      },
    );
  }, [onlineMatch]);

  const handleCallColor = useCallback(
    (color: CandyColor) => {
      soundEngine.playColorClick();

      if (mode === 'local') {
        if (!localRoom || localRoom.phase !== 'playing') return;
        const activePlayer =
          localRoom.activeSeat === 0 ? localRoom.players[0] : localRoom.players[1]!;
        const { nextState } = applyColorCallToRoom(localRoom, activePlayer.id, color);
        setLocalRoom(nextState);
        if (nextState.phase === 'playing') {
          if (nextState.pendingClear) {
            // HIT: pass device to defender immediately to drag highlighted candies
            setLocalCurtainVisible(true);
          } else {
            // MISS (Go Fish!): let splash play cleanly before Pass Device curtain appears
            window.setTimeout(() => {
              setLocalCurtainVisible(true);
            }, 1150);
          }
        }
        return;
      }

      const sock = socketRef.current;
      if (!sock || !onlineMatch) return;
      sock.emit(
        'game:call',
        {
          code: onlineMatch.code,
          playerToken: playerTokenRef.current,
          color,
        },
        (res: { ok?: boolean; error?: string }) => {
          if (!res?.ok && res?.error) {
            setErrorMessage(res.error);
          }
        },
      );
    },
    [mode, localRoom, onlineMatch],
  );

  const handleConfirmClear = useCallback(() => {
    if (mode === 'local') {
      if (!localRoom || !localRoom.pendingClear) return;
      const { nextState } = confirmClearInRoom(
        localRoom,
        localRoom.pendingClear.defenderId,
      );
      setLocalRoom(nextState);
      // Defender is already holding the device, so no curtain needed for their call!
      return;
    }

    const sock = socketRef.current;
    if (!sock || !onlineMatch) return;
    sock.emit(
      'game:confirmClear',
      {
        code: onlineMatch.code,
        playerToken: playerTokenRef.current,
      },
      (res: { ok?: boolean; error?: string }) => {
        if (!res?.ok && res?.error) {
          setErrorMessage(res.error);
        }
      },
    );
  }, [mode, localRoom, onlineMatch]);

  const handleRematch = useCallback(() => {
    if (mode === 'local' && localRoom) {
      const nextStarter: 0 | 1 = localRoom.activeSeat === 0 ? 1 : 0;
      const restarted = startMatchInRoom(
        localRoom,
        Math.random,
        Date.now(),
        nextStarter,
      );
      setLocalRoom(restarted);
      setLocalCurtainVisible(true);
      return;
    }

    const sock = socketRef.current;
    if (!sock || !onlineMatch) return;
    sock.emit('game:rematch', {
      code: onlineMatch.code,
      playerToken: playerTokenRef.current,
    });
  }, [mode, localRoom, onlineMatch]);

  const handleSendReaction = useCallback(
    (emoji: string, label: string) => {
      const sock = socketRef.current;
      if (!sock || !onlineMatch || mode !== 'online') return;
      sock.emit('game:reaction', {
        code: onlineMatch.code,
        playerToken: playerTokenRef.current,
        emoji,
        label,
      });
    },
    [onlineMatch, mode],
  );

  const handleLeaveToLobby = useCallback(() => {
    if (mode === 'online' && socketRef.current) {
      socketRef.current.emit('room:leave');
    }
    setOnlineMatch(null);
    setLocalRoom(null);
    setLocalCurtainVisible(false);
    setErrorMessage(null);
    setReactions([]);
    setGoFishFlashKey(0);
  }, [mode]);

  const handleCopyGameInvite = async () => {
    if (!onlineMatch) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/?room=${onlineMatch.code}`,
      );
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <div className="relative min-h-dvh w-full flex flex-col bg-stone-100 text-stone-900">
      {/* Marble Tabletop Surface Backdrop */}
      {!marbleLoadFailed && (
        <img
          src={MARBLE_BG_URL}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onError={() => setMarbleLoadFailed(true)}
          className="pointer-events-none fixed inset-0 w-full h-full object-cover opacity-85"
        />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-white/55 via-stone-50/35 to-stone-200/45"
      />

      {/* Compact Game Utility Bar */}
      <header className="relative z-20 w-full border-b border-stone-200/80 bg-white/85 backdrop-blur-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-base sm:text-lg font-extrabold tracking-tight text-stone-900 whitespace-nowrap shrink-0">
              Candy Line: Go Fish
            </span>
            {activeMatch && (
              <span className="hidden sm:inline text-xs text-stone-500 whitespace-nowrap">
                · {mode === 'local' ? 'Pass & Play' : `Room ${activeMatch.code}`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {mode === 'online' && activeMatch && activeMatch.phase !== 'waiting' && (
              <button
                type="button"
                onClick={handleCopyGameInvite}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer whitespace-nowrap"
              >
                {copiedInvite ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedInvite ? 'Copied Link' : `Code: ${activeMatch.code}`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowColorblindLabels((v) => !v)}
              aria-label={`Colorblind labels ${showColorblindLabels ? 'on' : 'off'}`}
              title="Toggle colorblind candy labels"
              className={`inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                showColorblindLabels
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              {showColorblindLabels ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">Symbols</span>
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              title={soundEnabled ? 'Sound On' : 'Sound Muted'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-stone-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              aria-label="How to play"
              title="Game rules"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {activeMatch && (
              <button
                type="button"
                onClick={handleLeaveToLobby}
                aria-label="Leave match to lobby"
                className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        {!activeMatch ? (
          <LobbyScreen
            initialRoomCode={initialQuery.roomCode}
            initialMode={mode}
            showColorblindLabels={showColorblindLabels}
            onToggleColorblind={() => setShowColorblindLabels((v) => !v)}
            onOpenRules={() => setRulesOpen(true)}
            onCreateOnlineRoom={handleCreateOnlineRoom}
            onJoinOnlineRoom={handleJoinOnlineRoom}
            onStartLocalMatch={handleStartLocalMatch}
            errorMessage={errorMessage}
            busy={busy}
          />
        ) : activeMatch.phase === 'waiting' ? (
          <WaitingRoom
            match={activeMatch}
            onUpdateSettings={handleUpdateSettings}
            onStartMatch={handleStartOnlineMatch}
            onLeaveRoom={handleLeaveToLobby}
            errorMessage={errorMessage}
          />
        ) : (
          <main className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
            {activeMatch.phase === 'gameover' && (
              <GameOverBanner
                match={activeMatch}
                mode={mode}
                onRematch={handleRematch}
                onBackToLobby={handleLeaveToLobby}
              />
            )}

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800"
              >
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Main Tabletop Mats & Wooden Divider */}
              <div className="lg:col-span-9 space-y-4">
                <TabletopBoard
                  match={activeMatch}
                  showColorblindLabels={showColorblindLabels}
                  reactions={reactions}
                  onConfirmClear={handleConfirmClear}
                />

                {activeMatch.phase === 'playing' && (
                  <ColorPickerBar
                    isMyTurn={activeMatch.isMyTurn}
                    selfId={activeMatch.self.id}
                    activePlayerName={activeMatch.self.name}
                    opponentName={activeMatch.opponent?.name ?? 'Opponent'}
                    pendingClear={activeMatch.pendingClear}
                    showColorblindLabels={showColorblindLabels}
                    onCallColor={handleCallColor}
                  />
                )}
              </div>

              {/* Side Panel: Move Log + Quick Emoji Reactions (Online) */}
              <div className="lg:col-span-3 space-y-4">
                <MoveHistoryLog
                  moves={activeMatch.moves}
                  showColorblindLabels={showColorblindLabels}
                />

                {mode === 'online' && (
                  <section
                    aria-label="Quick reactions"
                    className="rounded-2xl border border-stone-200/90 bg-white/90 p-3.5 shadow-sm"
                  >
                    <h2 className="font-display text-xs font-bold text-stone-700 mb-2">
                      Table Reactions
                    </h2>
                    <div className="grid grid-cols-6 lg:grid-cols-3 gap-1.5">
                      {REACTION_PRESETS.map((rx) => (
                        <button
                          key={rx.emoji}
                          type="button"
                          onClick={() => handleSendReaction(rx.emoji, rx.label)}
                          aria-label={`Send ${rx.label} reaction`}
                          title={rx.label}
                          className="h-10 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white hover:shadow-xs text-lg flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                        >
                          {rx.emoji}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </main>
        )}
      </div>

      {/* Local Pass-and-Play Privacy Screen */}
      {mode === 'local' &&
        activeMatch &&
        activeMatch.phase === 'playing' &&
        localCurtainVisible && (
          <PassDeviceCurtain
            nextPlayerName={activeMatch.self.name}
            lastMove={activeMatch.lastMove}
            pendingClear={activeMatch.pendingClear}
            isTrueBlind={activeMatch.settings.visibilityMode === 'true-blind'}
            onReveal={() => setLocalCurtainVisible(false)}
          />
        )}

      <GoFishOverlay
        flashKey={goFishFlashKey}
        lastMove={activeMatch?.lastMove ?? null}
        selfId={activeMatch?.self.id ?? ''}
        showColorblindLabels={showColorblindLabels}
      />

      <RulesModal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        showColorblindLabels={showColorblindLabels}
      />
    </div>
  );
}
