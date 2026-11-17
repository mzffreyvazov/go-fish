import { RotateCcw, Trophy } from 'lucide-react';
import type { ClientMatchView, GameMode } from '../game/types.ts';

interface GameOverBannerProps {
  match: ClientMatchView;
  mode: GameMode;
  onRematch: () => void;
  onBackToLobby: () => void;
}

export function GameOverBanner({
  match,
  mode,
  onRematch,
  onBackToLobby,
}: GameOverBannerProps) {
  const selfWon = match.winnerId === match.self.id;
  const winnerName = selfWon ? match.self.name : (match.opponent?.name ?? 'Opponent');
  const waitingForOpponentRematch =
    mode === 'online' && match.self.wantsRematch && !match.opponent?.wantsRematch;

  return (
    <section
      data-testid="gameover-summary"
      aria-label="Match results"
      className="w-full rounded-2xl border border-amber-300 bg-white/95 px-5 py-4 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4"
    >
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Trophy className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-display text-lg sm:text-xl font-extrabold text-stone-900">
            {mode === 'local'
              ? `${winnerName} Wins the Match!`
              : selfWon
                ? 'Victory! You Cleared Their Line!'
                : `${winnerName} Wins This Round`}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            The wooden divider has lifted — both candy lines and discard piles are now revealed below.
          </p>
        </div>
      </div>

      {/* Match Stats (tabular numerals) */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-5 text-left">
          <div>
            <div className="text-[11px] font-medium text-stone-500">Total Turns</div>
            <div className="font-mono text-lg font-bold tabular-nums text-stone-900">
              {match.turnNumber}
            </div>
          </div>
          <div className="h-8 w-px bg-stone-200" aria-hidden="true" />
          <div>
            <div className="text-[11px] font-medium text-stone-500">Go Fish Calls</div>
            <div className="font-mono text-lg font-bold tabular-nums text-sky-700">
              {match.goFishCount}
            </div>
          </div>
          <div className="h-8 w-px bg-stone-200" aria-hidden="true" />
          <div>
            <div className="text-[11px] font-medium text-stone-500">Your Left</div>
            <div className="font-mono text-lg font-bold tabular-nums text-stone-900">
              {match.self.remainingCount}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onRematch}
            disabled={waitingForOpponentRematch}
            data-start="true"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>
              {waitingForOpponentRematch
                ? 'Waiting for Opponent...'
                : mode === 'online' && match.opponent?.wantsRematch
                  ? 'Accept Rematch'
                  : 'Rematch'}
            </span>
          </button>
          <button
            type="button"
            onClick={onBackToLobby}
            className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm font-semibold hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Lobby
          </button>
        </div>
      </div>
    </section>
  );
}
