import { useEffect } from 'react';
import { CANDY_COLORS, CANDY_COLOR_META } from '../game/constants.ts';
import type { CandyColor, ClientPendingClear } from '../game/types.ts';
import { CandyToken } from './CandyToken.tsx';

interface ColorPickerBarProps {
  isMyTurn: boolean;
  selfId: string;
  activePlayerName: string;
  opponentName: string;
  pendingClear: ClientPendingClear | null;
  showColorblindLabels: boolean;
  disabled?: boolean;
  onCallColor: (color: CandyColor) => void;
}

export function ColorPickerBar({
  isMyTurn,
  selfId,
  activePlayerName,
  opponentName,
  pendingClear,
  showColorblindLabels,
  disabled = false,
  onCallColor,
}: ColorPickerBarProps) {
  useEffect(() => {
    if (!isMyTurn || disabled || pendingClear !== null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < CANDY_COLORS.length) {
        onCallColor(CANDY_COLORS[idx]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, disabled, pendingClear, onCallColor]);

  const isDefenderClearing = pendingClear?.defenderId === selfId;
  const isWaitingForDefenderClear =
    pendingClear !== null && pendingClear.defenderId !== selfId;

  const statusText = isDefenderClearing
    ? `${pendingClear.callerName} called ${CANDY_COLOR_META[pendingClear.calledColor].label}! Drag the highlighted candies to Discard.`
    : isWaitingForDefenderClear
      ? `Hit! Waiting for ${pendingClear.defenderName} to drag candies to discard...`
      : isMyTurn
        ? `Your Turn (${activePlayerName}) — Call a Color`
        : `Waiting for ${opponentName} to call a color...`;

  return (
    <section
      aria-label="Call a candy color"
      className="w-full rounded-2xl border border-stone-200/90 bg-white/95 px-4 py-3 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              isDefenderClearing
                ? 'bg-amber-500'
                : isMyTurn
                  ? 'bg-emerald-600'
                  : 'bg-stone-300'
            }`}
            aria-hidden="true"
          />
          <p className="text-sm sm:text-base font-semibold text-stone-900">
            {statusText}
          </p>
        </div>
        {!pendingClear && (
          <span className="text-xs text-stone-500 hidden sm:inline">
            Press 1–5 or click a candy
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {CANDY_COLORS.map((color, index) => {
          const meta = CANDY_COLOR_META[color];
          const canClick = isMyTurn && !disabled && pendingClear === null;
          return (
            <button
              key={color}
              type="button"
              disabled={!canClick}
              onClick={() => onCallColor(color)}
              aria-label={`Call ${meta.label}${showColorblindLabels ? ` (${meta.symbol} ${meta.shortCode})` : ''}`}
              className={`group relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-11 sm:min-h-12 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border text-[11px] sm:text-sm font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${
                canClick
                  ? 'border-stone-200 bg-stone-50/80 text-stone-900 hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:translate-y-0 cursor-pointer'
                  : 'border-stone-200/70 bg-stone-100/70 text-stone-400 cursor-not-allowed opacity-65'
              }`}
            >
              <CandyToken color={color} size="sm" showSymbol={showColorblindLabels} />
              <span className="whitespace-nowrap truncate leading-snug max-w-full">
                {meta.label}
              </span>
              {showColorblindLabels && (
                <span className="text-[11px] font-mono text-stone-500 hidden md:inline">
                  {meta.symbol}
                </span>
              )}
              <span
                aria-hidden="true"
                className="hidden lg:inline-flex items-center justify-center ml-auto text-[10px] font-mono text-stone-400"
              >
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
