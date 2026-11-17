import { AnimatePresence, motion } from 'motion/react';
import { CANDY_COLOR_META } from '../game/constants.ts';
import type { MoveRecord } from '../game/types.ts';
import { CandyToken } from './CandyToken.tsx';

interface GoFishOverlayProps {
  flashKey: number;
  lastMove: MoveRecord | null;
  selfId: string;
  showColorblindLabels: boolean;
}

const BUBBLES = [
  { id: 'b1', x: -120, y: -40, delay: 0.05, size: 14 },
  { id: 'b2', x: -75, y: -85, delay: 0.12, size: 10 },
  { id: 'b3', x: 85, y: -75, delay: 0.08, size: 16 },
  { id: 'b4', x: 130, y: -30, delay: 0.15, size: 11 },
  { id: 'b5', x: -45, y: 70, delay: 0.1, size: 12 },
  { id: 'b6', x: 65, y: 75, delay: 0.18, size: 9 },
];

export function GoFishOverlay({
  flashKey,
  lastMove,
  selfId,
  showColorblindLabels,
}: GoFishOverlayProps) {
  const visible = flashKey > 0 && lastMove !== null && !lastMove.hit;

  return (
    <AnimatePresence>
      {visible && lastMove && (
        <motion.div
          key={`gofish-screen-${flashKey}`}
          data-testid="gofish-overlay"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-sky-900/20"
        >
          {/* Expanding Water Ripple Rings */}
          <motion.div
            aria-hidden="true"
            initial={{ scale: 0.3, opacity: 0.7 }}
            animate={{ scale: 2.6, opacity: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute w-72 h-72 rounded-full border-4 border-sky-300/70"
          />
          <motion.div
            aria-hidden="true"
            initial={{ scale: 0.2, opacity: 0.6 }}
            animate={{ scale: 2.1, opacity: 0 }}
            transition={{ duration: 0.95, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="absolute w-64 h-64 rounded-full border-4 border-cyan-200/80"
          />

          {/* Floating Bubbles */}
          {BUBBLES.map((b) => (
            <motion.div
              key={b.id}
              aria-hidden="true"
              initial={{ x: b.x * 0.4, y: b.y * 0.4 + 24, scale: 0.3, opacity: 0 }}
              animate={{ x: b.x, y: b.y - 36, scale: 1.1, opacity: [0, 0.85, 0] }}
              transition={{ duration: 1.15, delay: b.delay, ease: 'easeOut' }}
              style={{ width: b.size, height: b.size }}
              className="absolute rounded-full border-2 border-white/80 bg-sky-200/55 shadow-sm"
            />
          ))}

          {/* Center Splash Card */}
          <motion.div
            initial={{ scale: 0.65, y: 24, rotate: -3, opacity: 0 }}
            animate={{
              scale: [0.65, 1.07, 1],
              y: [24, -6, 0],
              rotate: [-3, 2, 0],
              opacity: 1,
            }}
            exit={{ scale: 0.88, y: -18, opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-4 flex flex-col items-center rounded-3xl border-2 border-sky-300 bg-white/95 px-8 py-6 text-center shadow-[0_24px_60px_-12px_rgba(14,116,144,0.4)]"
          >
            {/* Animated Leaping Fish SVG */}
            <motion.div
              aria-hidden="true"
              animate={{
                y: [0, -10, 0],
                rotate: [-6, 6, -4],
              }}
              transition={{ duration: 0.85, repeat: 1, ease: 'easeInOut' }}
              className="mb-2"
            >
              <svg width="72" height="54" viewBox="0 0 72 54" fill="none">
                {/* Splash Droplets */}
                <circle cx="14" cy="14" r="3" fill="#38BDF8" />
                <circle cx="58" cy="12" r="2.5" fill="#0EA5E9" />
                <circle cx="62" cy="24" r="2" fill="#7DD3FC" />
                {/* Tail Fin */}
                <path
                  d="M18 28L4 17C3 24 3 32 4 39L18 28Z"
                  fill="#0284C7"
                />
                {/* Fish Body */}
                <ellipse cx="38" cy="28" rx="22" ry="15" fill="#0EA5E9" />
                <ellipse cx="40" cy="24" rx="16" ry="8" fill="#38BDF8" opacity="0.6" />
                {/* Dorsal Fin */}
                <path
                  d="M29 14C34 7 44 7 47 15L29 14Z"
                  fill="#0369A1"
                />
                {/* Eye */}
                <circle cx="50" cy="25" r="4" fill="#FFFFFF" />
                <circle cx="51.5" cy="25" r="2" fill="#0F172A" />
                {/* Smile */}
                <path
                  d="M52 32C54 33.5 57 33 59 31"
                  stroke="#0C4A6E"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>

            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-sky-900">
              GO FISH!
            </h2>

            <div className="mt-2.5 flex items-center justify-center gap-2 text-sm sm:text-base font-semibold text-stone-700">
              <CandyToken
                color={lastMove.calledColor}
                size="sm"
                showSymbol={showColorblindLabels}
              />
              <span>
                {lastMove.callerId === selfId ? 'You' : lastMove.callerName} called{' '}
                {CANDY_COLOR_META[lastMove.calledColor].label} —{' '}
                {lastMove.defenderId === selfId ? 'you have' : `${lastMove.defenderName} has`}{' '}
                none!
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
