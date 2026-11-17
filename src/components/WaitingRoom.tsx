import { useState } from 'react';
import { Check, Copy, Link2, Play, Users } from 'lucide-react';
import { LINE_LENGTH_OPTIONS } from '../game/constants.ts';
import type { ClientMatchView, RoomSettings } from '../game/types.ts';

interface WaitingRoomProps {
  match: ClientMatchView;
  onUpdateSettings: (settings: RoomSettings) => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  errorMessage: string | null;
}

export function WaitingRoom({
  match,
  onUpdateSettings,
  onStartMatch,
  onLeaveRoom,
  errorMessage,
}: WaitingRoomProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isHost = match.self.id === match.hostId;
  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?room=${match.code}`
      : `/?room=${match.code}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(match.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Clipboard blocked in non-HTTPS contexts
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // Clipboard blocked in non-HTTPS contexts
    }
  };

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <section className="rounded-2xl border border-stone-200/90 bg-white/95 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-stone-200">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-stone-900">
              Online Game Room
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Share the room code or invite link with a friend to sit across the divider.
            </p>
          </div>
          <button
            type="button"
            onClick={onLeaveRoom}
            className="px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            Leave Room
          </button>
        </div>

        {/* Shareable Room Code & Invite Link */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-stone-500">Room Code</div>
            <div
              data-testid="room-code-display"
              className="font-mono text-3xl font-extrabold tracking-widest text-stone-900 mt-0.5"
            >
              {match.code}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-800 hover:bg-stone-50 cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copied Code' : 'Copy Code'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
              <span>{copiedLink ? 'Invite Copied' : 'Copy Invite Link'}</span>
            </button>
          </div>
        </div>

        {/* Seated Players */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-600 mb-2.5">
            <Users className="w-4 h-4" />
            <span>Players ({match.opponent ? '2/2' : '1/2'})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-stone-900">{match.self.name}</div>
                <div className="text-xs text-stone-500">
                  {isHost ? 'Room Host · You' : 'Challenger · You'}
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700">Ready</span>
            </div>

            <div
              className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
                match.opponent
                  ? 'border-stone-200 bg-stone-50/70'
                  : 'border-dashed border-stone-300 bg-stone-50/30'
              }`}
            >
              {match.opponent ? (
                <>
                  <div>
                    <div className="text-sm font-bold text-stone-900">
                      {match.opponent.name}
                    </div>
                    <div className="text-xs text-stone-500">
                      {match.opponent.id === match.hostId ? 'Room Host' : 'Challenger'}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      match.opponent.connected ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {match.opponent.connected ? 'Ready' : 'Reconnecting'}
                  </span>
                </>
              ) : (
                <div className="text-xs text-stone-500 py-1">
                  Waiting for opponent to join...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Match Settings */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-700">Match Rules</span>
            {!isHost && (
              <span className="text-[11px] text-stone-500">Host controls settings</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {LINE_LENGTH_OPTIONS.map((len) => (
              <button
                key={len}
                type="button"
                disabled={!isHost}
                onClick={() =>
                  onUpdateSettings({ ...match.settings, lineLength: len })
                }
                className={`py-2 px-3 rounded-xl border text-xs font-semibold tabular-nums transition-colors ${
                  match.settings.lineLength === len
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-stone-50 text-stone-700'
                } ${isHost ? 'cursor-pointer hover:bg-stone-100' : 'opacity-80 cursor-default'}`}
              >
                {len} Candies
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!isHost}
              onClick={() =>
                onUpdateSettings({ ...match.settings, visibilityMode: 'true-blind' })
              }
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                match.settings.visibilityMode === 'true-blind'
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-stone-50 text-stone-700'
              } ${isHost ? 'cursor-pointer' : 'opacity-80 cursor-default'}`}
            >
              True Blind Mode
            </button>
            <button
              type="button"
              disabled={!isHost}
              onClick={() =>
                onUpdateSettings({ ...match.settings, visibilityMode: 'count-visible' })
              }
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                match.settings.visibilityMode === 'count-visible'
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-stone-50 text-stone-700'
              } ${isHost ? 'cursor-pointer' : 'opacity-80 cursor-default'}`}
            >
              Show Remaining Count
            </button>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
          >
            {errorMessage}
          </div>
        )}

        {isHost ? (
          <button
            type="button"
            disabled={!match.opponent}
            onClick={onStartMatch}
            data-start="true"
            className="w-full inline-flex items-center justify-center gap-2 min-h-12 px-5 py-3 rounded-xl bg-stone-900 text-white font-display text-base font-bold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>
              {match.opponent ? 'Start Match' : 'Waiting for Opponent to Join...'}
            </span>
          </button>
        ) : (
          <div className="rounded-xl bg-stone-100 px-4 py-3 text-center text-xs font-semibold text-stone-700">
            Waiting for {match.opponent?.name ?? 'the host'} to start the match...
          </div>
        )}
      </section>
    </main>
  );
}
