import { CANDY_COLOR_META } from '../game/constants.ts';
import type { MoveRecord } from '../game/types.ts';
import { CandyToken } from './CandyToken.tsx';

interface MoveHistoryLogProps {
  moves: MoveRecord[];
  showColorblindLabels: boolean;
}

export function MoveHistoryLog({ moves, showColorblindLabels }: MoveHistoryLogProps) {
  const recentMoves = [...moves].reverse().slice(0, 12);

  return (
    <aside
      aria-label="Move history"
      className="rounded-2xl border border-stone-200/90 bg-white/90 p-3.5 shadow-sm flex flex-col"
    >
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-stone-200/70">
        <h2 className="font-display text-sm font-bold text-stone-900">Recent Calls</h2>
        <span className="text-xs font-mono tabular-nums text-stone-500">
          {moves.length} {moves.length === 1 ? 'turn' : 'turns'}
        </span>
      </div>

      {recentMoves.length === 0 ? (
        <p className="text-xs text-stone-500 py-3">
          No colors called yet. Pick a color below to inspect your opponent&apos;s line from the bottom up.
        </p>
      ) : (
        <ul className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {recentMoves.map((move) => {
            const colorMeta = CANDY_COLOR_META[move.calledColor];
            return (
              <li
                key={move.id}
                className="flex items-start gap-2.5 text-xs leading-relaxed py-1.5 border-b border-stone-100 last:border-b-0"
              >
                <span className="font-mono tabular-nums text-stone-400 shrink-0 pt-0.5">
                  #{move.turnNumber}
                </span>
                <CandyToken
                  color={move.calledColor}
                  size="xs"
                  showSymbol={showColorblindLabels}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1 text-stone-700">
                  <span className="font-semibold text-stone-900">{move.callerName}</span>{' '}
                  called{' '}
                  <span className="font-semibold text-stone-900">{colorMeta.label}</span>
                  {' → '}
                  {!move.hit ? (
                    <span className="font-semibold text-sky-700">Go Fish!</span>
                  ) : move.clearedCount === null ? (
                    <span className="font-semibold text-emerald-700">
                      Hit! {move.defenderName} cleared candies
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-700">
                      {move.defenderName} removed{' '}
                      <span className="tabular-nums">{move.clearedCount}</span>{' '}
                      {move.clearedCount === 1 ? 'candy' : 'candies'}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
