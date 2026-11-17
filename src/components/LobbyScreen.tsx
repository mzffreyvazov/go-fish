import { useState } from 'react';
import { Eye, EyeOff, HelpCircle, Users, Wifi } from 'lucide-react';
import { CANDY_COLORS, LINE_LENGTH_OPTIONS } from '../game/constants.ts';
import type { GameMode, LineLength, RoomSettings, VisibilityMode } from '../game/types.ts';
import { CandyToken } from './CandyToken.tsx';

interface LobbyScreenProps {
  initialRoomCode: string;
  initialMode: GameMode;
  showColorblindLabels: boolean;
  onToggleColorblind: () => void;
  onOpenRules: () => void;
  onCreateOnlineRoom: (playerName: string, settings: RoomSettings) => Promise<void>;
  onJoinOnlineRoom: (code: string, playerName: string) => Promise<void>;
  onStartLocalMatch: (p1Name: string, p2Name: string, settings: RoomSettings) => void;
  errorMessage: string | null;
  busy: boolean;
}

export function LobbyScreen({
  initialRoomCode,
  initialMode,
  showColorblindLabels,
  onToggleColorblind,
  onOpenRules,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onStartLocalMatch,
  errorMessage,
  busy,
}: LobbyScreenProps) {
  const [mode, setMode] = useState<GameMode>(initialRoomCode ? 'online' : initialMode);
  const [onlineAction, setOnlineAction] = useState<'create' | 'join'>(
    initialRoomCode ? 'join' : 'create',
  );
  const [playerName, setPlayerName] = useState('Alex');
  const [joinCode, setJoinCode] = useState(initialRoomCode);
  const [localP1, setLocalP1] = useState('Player 1');
  const [localP2, setLocalP2] = useState('Player 2');
  const [lineLength, setLineLength] = useState<LineLength>(18);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('true-blind');
  const [validationError, setValidationError] = useState<string | null>(null);

  const activeError = validationError ?? errorMessage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (mode === 'local') {
      const p1 = localP1.trim();
      const p2 = localP2.trim();
      if (!p1 || !p2) {
        setValidationError('Please enter names for both players.');
        return;
      }
      onStartLocalMatch(p1, p2, { lineLength, visibilityMode });
      return;
    }

    const name = playerName.trim();
    if (!name) {
      setValidationError('Please enter your display name.');
      return;
    }

    if (onlineAction === 'create') {
      await onCreateOnlineRoom(name, { lineLength, visibilityMode });
    } else {
      const cleanCode = joinCode.trim().toUpperCase();
      if (cleanCode.length < 4) {
        setValidationError('Enter the 5-character room code from your friend.');
        return;
      }
      await onJoinOnlineRoom(cleanCode, name);
    }
  };

  return (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Title Emblem & Interactive Tabletop Showcase */}
        <section className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white/90 p-6 sm:p-8 shadow-sm">
          <div>
            {/* Custom Inline SVG Emblem */}
            <div className="flex items-center gap-3 mb-5">
              <svg
                width="44"
                height="44"
                viewBox="0 0 44 44"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <rect x="2" y="2" width="40" height="40" rx="12" fill="#FFFDF8" stroke="#D6D3D1" strokeWidth="1.5" />
                <rect x="20" y="6" width="4" height="32" rx="2" fill="#9C6231" />
                <circle cx="12" cy="14" r="4.2" fill="#E11D48" />
                <circle cx="12" cy="24" r="4.2" fill="#EAB308" />
                <circle cx="12" cy="34" r="4.2" fill="#16A34A" />
                <circle cx="32" cy="14" r="4.2" fill="#D6D3D1" />
                <circle cx="32" cy="24" r="4.2" fill="#D6D3D1" />
                <circle cx="32" cy="34" r="4.2" fill="#D6D3D1" />
              </svg>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 text-balance leading-tight">
                  Candy Line: Go Fish
                </h1>
              </div>
            </div>

            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Line up your candies behind the wooden divider. Call colors to clear your
              opponent&apos;s line from the bottom up—first player to empty the other&apos;s board
              wins.
            </p>

            {/* Tactile Mini Tabletop Preview */}
            <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
              <div className="flex items-stretch justify-center gap-3">
                <div className="flex-1 rounded-xl border border-stone-200 paper-mat-left p-3 flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-stone-500 mb-1">Your Line</span>
                  {CANDY_COLORS.map((color, idx) => (
                    <CandyToken
                      key={color}
                      color={color}
                      size="sm"
                      showSymbol={showColorblindLabels}
                      isBottom={idx === CANDY_COLORS.length - 1}
                    />
                  ))}
                </div>

                <div
                  className="w-4 rounded-lg wood-grain border border-amber-950/25 shadow-md shrink-0"
                  aria-hidden="true"
                />

                <div className="flex-1 rounded-xl border border-dashed border-stone-300 bg-stone-100/90 p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-semibold text-stone-700">Opponent</span>
                  <span className="text-[11px] text-stone-500 mt-1">
                    Hidden behind the divider
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-200/80 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onOpenRules}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Full Rules</span>
            </button>

            <button
              type="button"
              onClick={onToggleColorblind}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 cursor-pointer"
            >
              {showColorblindLabels ? (
                <Eye className="w-4 h-4 text-emerald-700" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              <span>Colorblind Labels: {showColorblindLabels ? 'On' : 'Off'}</span>
            </button>
          </div>
        </section>

        {/* Right Column: Match Setup Form */}
        <section className="lg:col-span-7 rounded-2xl border border-stone-200/90 bg-white/95 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Segmented Control */}
            <div>
              <span className="block text-xs font-semibold text-stone-500 mb-2">
                Game Mode
              </span>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-stone-100 border border-stone-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setMode('online');
                    setValidationError(null);
                  }}
                  className={`flex items-center justify-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    mode === 'online'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Wifi className="w-4 h-4" />
                  <span>Online Multiplayer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('local');
                    setValidationError(null);
                  }}
                  className={`flex items-center justify-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    mode === 'local'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Local Pass &amp; Play</span>
                </button>
              </div>
            </div>

            {mode === 'online' ? (
              <div className="space-y-5">
                {/* Create vs Join Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOnlineAction('create');
                      setValidationError(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      onlineAction === 'create'
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    Create Room
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOnlineAction('join');
                      setValidationError(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      onlineAction === 'join'
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    Join with Code
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="online-player-name"
                    className="block text-xs font-semibold text-stone-700 mb-1.5"
                  >
                    Your Name
                  </label>
                  <input
                    id="online-player-name"
                    type="text"
                    maxLength={18}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>

                {onlineAction === 'join' && (
                  <div>
                    <label
                      htmlFor="join-room-code"
                      className="block text-xs font-semibold text-stone-700 mb-1.5"
                    >
                      Room Code
                    </label>
                    <input
                      id="join-room-code"
                      type="text"
                      maxLength={8}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="e.g. XK92M"
                      className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white font-mono text-base font-bold tracking-widest text-stone-900 uppercase focus:outline-none focus:ring-2 focus:ring-stone-900"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="local-p1-name"
                    className="block text-xs font-semibold text-stone-700 mb-1.5"
                  >
                    Player 1 Name
                  </label>
                  <input
                    id="local-p1-name"
                    type="text"
                    maxLength={18}
                    value={localP1}
                    onChange={(e) => setLocalP1(e.target.value)}
                    placeholder="Player 1"
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="local-p2-name"
                    className="block text-xs font-semibold text-stone-700 mb-1.5"
                  >
                    Player 2 Name
                  </label>
                  <input
                    id="local-p2-name"
                    type="text"
                    maxLength={18}
                    value={localP2}
                    onChange={(e) => setLocalP2(e.target.value)}
                    placeholder="Player 2"
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>
            )}

            {/* Shared Match Options (hidden when joining an existing online room) */}
            {(mode === 'local' || onlineAction === 'create') && (
              <div className="space-y-4 pt-2 border-t border-stone-200/80">
                <div>
                  <span className="block text-xs font-semibold text-stone-700 mb-2">
                    Candies Per Line
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {LINE_LENGTH_OPTIONS.map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => setLineLength(len)}
                        className={`min-h-11 px-3 py-2 rounded-xl border text-sm font-semibold tabular-nums transition-colors cursor-pointer ${
                          lineLength === len
                            ? 'border-stone-900 bg-stone-900 text-white'
                            : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {len} Candies
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-stone-700 mb-2">
                    Divider Privacy Rule
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibilityMode('true-blind')}
                      className={`text-left px-3.5 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                        visibilityMode === 'true-blind'
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                      }`}
                    >
                      <div className="text-xs font-bold">True Blind Mode (Default)</div>
                      <div
                        className={`text-[11px] mt-0.5 ${
                          visibilityMode === 'true-blind' ? 'text-stone-300' : 'text-stone-500'
                        }`}
                      >
                        Hide opponent count and cleared totals until the divider lifts
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisibilityMode('count-visible')}
                      className={`text-left px-3.5 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                        visibilityMode === 'count-visible'
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                      }`}
                    >
                      <div className="text-xs font-bold">Show Remaining Count</div>
                      <div
                        className={`text-[11px] mt-0.5 ${
                          visibilityMode === 'count-visible' ? 'text-stone-300' : 'text-stone-500'
                        }`}
                      >
                        See how many candies opponent has left
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
              >
                {activeError}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              data-start="true"
              className="w-full min-h-12 px-5 py-3 rounded-xl bg-stone-900 text-white font-display text-base font-bold hover:bg-stone-800 disabled:opacity-60 transition-colors cursor-pointer shadow-sm"
            >
              {busy
                ? 'Connecting...'
                : mode === 'local'
                  ? 'Start Local Match'
                  : onlineAction === 'create'
                    ? 'Create Online Room'
                    : 'Join Online Room'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
