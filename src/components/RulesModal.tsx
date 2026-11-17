import { X } from 'lucide-react';
import { CandyToken } from './CandyToken.tsx';

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
  showColorblindLabels: boolean;
}

export function RulesModal({ open, onClose, showColorblindLabels }: RulesModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-stone-200">
          <h2 id="rules-modal-title" className="font-display text-xl font-bold text-stone-900">
            How to Play Candy Line: Go Fish
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rules"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ol className="mt-4 space-y-3 text-sm text-stone-700 leading-relaxed list-decimal list-inside">
          <li>
            <span className="font-semibold text-stone-900">The Hidden Line:</span> Both players get
            a vertical line of randomized candies (12, 18, or 24) behind a wooden divider. Neither
            player can see the opponent&apos;s colors.
          </li>
          <li>
            <span className="font-semibold text-stone-900">Call a Color:</span> On your turn, pick
            one of the 5 candy colors (Red, Orange, Yellow, Green, or Purple) to attack your
            opponent&apos;s line.
          </li>
          <li>
            <span className="font-semibold text-stone-900">Highlight &amp; Drag to Discard:</span>{' '}
            If your opponent has that color, the matching candy and every candy below it light up on
            their board—they click and drag the highlighted candies sideways into their discard pile.
          </li>
          <li>
            <span className="font-semibold text-stone-900">Go Fish!</span> If they have none of
            that color left in their line, it&apos;s a &ldquo;Go Fish!&rdquo; — zero candies are
            removed and the turn passes.
          </li>
          <li>
            <span className="font-semibold text-stone-900">Win Condition:</span> As soon as a
            player&apos;s line hits <strong>0 candies</strong>, the other player wins and the wooden
            divider lifts to reveal both boards!
          </li>
        </ol>

        <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-stone-200">
          <div className="flex items-center gap-1.5">
            {(['red', 'orange', 'yellow', 'green', 'purple'] as const).map((c) => (
              <CandyToken key={c} color={c} size="xs" showSymbol={showColorblindLabels} />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
