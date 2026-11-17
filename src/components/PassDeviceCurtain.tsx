import { Eye, ShieldCheck } from 'lucide-react';
import { CANDY_COLOR_META } from '../game/constants.ts';
import type { ClientPendingClear, MoveRecord } from '../game/types.ts';

interface PassDeviceCurtainProps {
  nextPlayerName: string;
  lastMove: MoveRecord | null;
  pendingClear: ClientPendingClear | null;
  isTrueBlind: boolean;
  onReveal: () => void;
}

export function PassDeviceCurtain({
  nextPlayerName,
  lastMove,
  pendingClear,
  isTrueBlind,
  onReveal,
}: PassDeviceCurtainProps) {
  return (
    <div
      data-testid="pass-device-curtain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pass-device-heading"
      className="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/80 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 text-center shadow-2xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <h2
          id="pass-device-heading"
          className="font-display text-2xl font-extrabold text-stone-900"
        >
          Pass Device to {nextPlayerName}
        </h2>

        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
          {pendingClear
            ? `${pendingClear.callerName} called ${CANDY_COLOR_META[pendingClear.calledColor].label} and matched! Reveal your board to drag your highlighted candies to Discard.`
            : `Keep the screen hidden until ${nextPlayerName} is holding the device so nobody sees your candy line.`}
        </p>

        {!pendingClear && lastMove && (
          <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-700">
            <span className="font-semibold text-stone-900">Last turn: </span>
            {lastMove.callerName} called{' '}
            <span className="font-semibold">
              {CANDY_COLOR_META[lastMove.calledColor].label}
            </span>
            {' → '}
            {!lastMove.hit ? (
              <span className="font-semibold text-sky-700">Go Fish!</span>
            ) : isTrueBlind || lastMove.clearedCount === null ? (
              <span className="font-semibold text-emerald-700">Hit! Candies cleared</span>
            ) : (
              <span className="font-semibold text-emerald-700">
                {lastMove.clearedCount} {lastMove.clearedCount === 1 ? 'candy' : 'candies'}{' '}
                cleared
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onReveal}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 min-h-12 px-5 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>
            {pendingClear
              ? `Reveal & Clear ${nextPlayerName}'s Candies`
              : `Tap to Reveal ${nextPlayerName}'s Board`}
          </span>
        </button>
      </div>
    </div>
  );
}
