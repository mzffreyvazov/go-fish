import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUp, EyeOff, GripVertical, Lock, Sparkles } from 'lucide-react';
import { CANDY_COLOR_META } from '../game/constants.ts';
import type { CandyPiece, ClientMatchView, EmojiReactionPayload } from '../game/types.ts';
import { CandyToken } from './CandyToken.tsx';

interface TabletopBoardProps {
  match: ClientMatchView;
  showColorblindLabels: boolean;
  reactions: EmojiReactionPayload[];
  onConfirmClear: () => void;
}

function getCandySizeForLength(lineLength: number): 'xs' | 'sm' | 'md' {
  if (lineLength >= 24) return 'xs';
  if (lineLength >= 18) return 'sm';
  return 'md';
}

interface PlayerMatProps {
  side: 'left' | 'right';
  playerName: string;
  isSelf: boolean;
  isActiveTurn: boolean;
  isWinner: boolean;
  connected: boolean;
  line: CandyPiece[] | null;
  discarded: CandyPiece[] | null;
  remainingCount: number | null;
  lineLength: number;
  showColorblindLabels: boolean;
  revealed: boolean;
  isTrueBlind: boolean;
  pendingTargetIds: Set<string> | null;
  pendingCallerName: string | null;
  pendingCalledColor: keyof typeof CANDY_COLOR_META | null;
  onConfirmClear?: () => void;
}

function PlayerMat({
  side,
  playerName,
  isSelf,
  isActiveTurn,
  isWinner,
  connected,
  line,
  discarded,
  remainingCount,
  lineLength,
  showColorblindLabels,
  revealed,
  isTrueBlind,
  pendingTargetIds,
  pendingCallerName,
  pendingCalledColor,
  onConfirmClear,
}: PlayerMatProps) {
  const candySize = getCandySizeForLength(lineLength);
  const matClass = side === 'left' ? 'paper-mat-left' : 'paper-mat-right';
  const isHiddenOpponent = !isSelf && !revealed;
  const orderClass = isSelf ? 'order-3 md:order-1' : 'order-1 md:order-3';

  const discardTrayRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isOverDiscard, setIsOverDiscard] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const hasPendingDrag = Boolean(
    isSelf && pendingTargetIds && pendingTargetIds.size > 0 && onConfirmClear,
  );

  // Reset drag state whenever pending targets change
  useEffect(() => {
    setDragging(false);
    setDragOffset({ x: 0, y: 0 });
    setIsOverDiscard(false);
    dragStartRef.current = null;
  }, [pendingTargetIds]);

  const checkOverDiscardZone = (clientX: number, clientY: number, dx: number): boolean => {
    // Sideways swipe threshold toward the left-side discard tray
    if (side === 'left' && dx <= -44) return true;
    if (side === 'right' && dx >= 44) return true;

    const rect = discardTrayRef.current?.getBoundingClientRect();
    if (!rect) return false;
    const pad = 24;
    return (
      clientX >= rect.left - pad &&
      clientX <= rect.right + pad &&
      clientY >= rect.top - pad &&
      clientY <= rect.bottom + pad
    );
  };

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setDragOffset({ x: dx, y: dy });
      setIsOverDiscard(checkOverDiscardZone(e.clientX, e.clientY, dx));
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dropped = checkOverDiscardZone(e.clientX, e.clientY, dx);
      setDragging(false);
      setDragOffset({ x: 0, y: 0 });
      setIsOverDiscard(false);
      dragStartRef.current = null;
      if (dropped) {
        onConfirmClear?.();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragging, onConfirmClear]);

  const untargetedLine =
    line && hasPendingDrag && pendingTargetIds
      ? line.filter((piece) => !pendingTargetIds.has(piece.id))
      : (line ?? []);

  const highlightedLine =
    line && hasPendingDrag && pendingTargetIds
      ? line.filter((piece) => pendingTargetIds.has(piece.id))
      : [];

  return (
    <div
      data-testid={isSelf ? 'self-mat' : 'opponent-mat'}
      className={`relative flex-1 min-w-0 rounded-2xl border transition-shadow duration-200 p-3 sm:p-5 flex flex-col justify-between ${orderClass} ${matClass} ${
        isWinner
          ? 'border-amber-400 shadow-lg ring-2 ring-amber-400/50'
          : hasPendingDrag
            ? 'border-amber-400 shadow-md ring-2 ring-amber-400/50'
            : isActiveTurn
              ? 'border-stone-300 shadow-md ring-2 ring-emerald-600/35'
              : 'border-stone-200/90 shadow-sm'
      }`}
    >
      {/* Mat Header */}
      <div
        className={`flex items-center justify-between gap-2 ${
          isHiddenOpponent ? 'pb-2 mb-2 md:pb-3 md:mb-3' : 'pb-2.5 mb-2.5 sm:pb-3 sm:mb-3'
        } border-b border-stone-200/80`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base sm:text-lg font-bold text-stone-900 truncate">
              {playerName}
            </h3>
            {isSelf && (
              <span className="text-xs font-medium text-stone-500 whitespace-nowrap">
                · You
              </span>
            )}
            {!connected && (
              <span className="text-xs font-medium text-rose-600 whitespace-nowrap">
                · Offline
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500">
            {isWinner
              ? 'Match Winner'
              : hasPendingDrag
                ? 'Drag highlighted candies to Discard'
                : isActiveTurn
                  ? 'Active turn'
                  : 'Defending line'}
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="font-mono text-lg sm:text-xl font-bold tabular-nums text-stone-900 leading-none">
            {remainingCount !== null ? remainingCount : '?'}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {remainingCount !== null ? 'left' : 'blind'}
          </div>
        </div>
      </div>

      {/* Pending Clear Prompt Banner for Defender */}
      {hasPendingDrag && pendingCalledColor && (
        <div
          data-testid="drag-instruction-banner"
          className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 flex items-center justify-between gap-2"
        >
          <span>
            {pendingCallerName} called {CANDY_COLOR_META[pendingCalledColor].label}! Click &amp;
            drag the highlighted candies to Discard.
          </span>
          <ArrowLeft className="w-4 h-4 shrink-0 text-amber-700" />
        </div>
      )}

      {/* Mat Body: Hidden Shield OR Candy Line + Outer Discard Tray */}
      {isHiddenOpponent ? (
        <div
          data-testid="opponent-hidden-shield"
          className="flex-1 min-h-0 md:min-h-80 rounded-xl border border-dashed border-stone-300 bg-stone-100/80 flex flex-row md:flex-col items-center justify-start md:justify-center text-left md:text-center gap-3 md:gap-0 px-3.5 py-2.5 md:p-5"
        >
          <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-stone-200/80 flex items-center justify-center text-stone-600 md:mb-3 shadow-inner shrink-0">
            {isTrueBlind ? (
              <EyeOff className="w-4 h-4 md:w-6 md:h-6" />
            ) : (
              <Lock className="w-4 h-4 md:w-6 md:h-6" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display text-xs sm:text-sm md:text-base font-bold text-stone-800">
              Hidden Behind Divider
            </p>
            <p className="text-[11px] md:text-xs text-stone-600 max-w-56 md:mt-1.5 leading-snug md:leading-relaxed">
              {isTrueBlind
                ? 'True Blind Mode is active until the divider lifts.'
                : `${playerName} has ${remainingCount ?? '?'} ${
                    remainingCount === 1 ? 'candy' : 'candies'
                  } remaining.`}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={`flex-1 flex items-stretch gap-3 sm:gap-5 ${
            side === 'left' ? 'flex-row' : 'flex-row-reverse'
          }`}
        >
          {/* Outer Discard Pile / Drop Zone */}
          <div
            ref={discardTrayRef}
            data-testid={isSelf ? 'self-discard-tray' : 'opponent-discard-tray'}
            className={`w-24 sm:w-28 shrink-0 rounded-xl border p-2.5 flex flex-col transition-all duration-150 ${
              isOverDiscard
                ? 'border-2 border-dashed border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-400/40 scale-[1.02]'
                : hasPendingDrag
                  ? 'border-2 border-dashed border-amber-400 bg-amber-50/50'
                  : 'border-stone-200/90 bg-stone-100/70'
            }`}
          >
            <div className="flex items-center justify-between gap-1 pb-1.5 mb-2 border-b border-stone-200/70">
              <span className="text-[11px] font-semibold text-stone-700">
                {isOverDiscard ? 'Drop!' : 'Discard'}
              </span>
              <span className="text-[11px] font-mono tabular-nums text-stone-500">
                {discarded?.length ?? 0}
              </span>
            </div>
            {!discarded || discarded.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[11px] text-stone-500 text-center px-1">
                {hasPendingDrag ? 'Drag candies here' : 'Cleared candies land here'}
              </div>
            ) : (
              <div className="flex flex-wrap content-start gap-1.5 overflow-y-auto max-h-80">
                <AnimatePresence initial={false}>
                  {discarded.map((piece) => (
                    <motion.div
                      key={piece.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.22 }}
                    >
                      <CandyToken
                        color={piece.color}
                        size="xs"
                        showSymbol={showColorblindLabels}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Vertical Candy Line Rail */}
          <div className="flex-1 flex flex-col items-center justify-between py-1">
            <span className="text-[11px] font-medium text-stone-400 tracking-wide">
              Top End
            </span>

            <div
              data-testid={isSelf ? 'self-candy-line' : 'opponent-candy-line'}
              className="my-1.5 md:my-2 flex flex-col items-center justify-center gap-0.5 md:gap-1 min-h-24 md:min-h-40"
            >
              {line && line.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                  <span className="text-xs font-semibold text-stone-600">
                    Line Cleared!
                  </span>
                </div>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {untargetedLine.map((piece, idx) => {
                      const isBottomPiece =
                        highlightedLine.length === 0 && idx === untargetedLine.length - 1;
                      return (
                        <motion.div
                          key={piece.id}
                          layout="position"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{
                            opacity: 0,
                            scale: 0.6,
                            x: side === 'left' ? -40 : 40,
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 28,
                          }}
                        >
                          <CandyToken
                            color={piece.color}
                            size={candySize}
                            showSymbol={showColorblindLabels}
                            isBottom={isBottomPiece}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Highlighted Draggable Cleared Segment */}
                  {highlightedLine.length > 0 && (
                    <div
                      role="button"
                      tabIndex={0}
                      data-testid="draggable-clear-group"
                      aria-label={`Drag ${highlightedLine.length} highlighted ${
                        highlightedLine.length === 1 ? 'candy' : 'candies'
                      } to discard tray`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        dragStartRef.current = { x: e.clientX, y: e.clientY };
                        setDragging(true);
                        setDragOffset({ x: 0, y: 0 });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onConfirmClear?.();
                        }
                      }}
                      style={{
                        transform: dragging
                          ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(1.04)`
                          : 'translate3d(0, 0, 0)',
                        transition: dragging ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      className={`relative z-20 mt-0.5 flex flex-col items-center gap-0.5 md:gap-1 px-2.5 py-2 rounded-2xl border-2 touch-none select-none ${
                        dragging
                          ? 'cursor-grabbing border-emerald-600 bg-emerald-50/90 shadow-xl'
                          : 'cursor-grab border-amber-500 bg-amber-100/80 shadow-md hover:bg-amber-100'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900 mb-0.5">
                        <GripVertical className="w-3 h-3" />
                        <span>Drag ←</span>
                      </div>
                      {highlightedLine.map((piece, idx) => (
                        <div
                          key={piece.id}
                          data-testid="highlighted-candy"
                          className={
                            idx === 0
                              ? 'rounded-full ring-2 ring-stone-900 ring-offset-1 ring-offset-amber-100'
                              : ''
                          }
                        >
                          <CandyToken
                            color={piece.color}
                            size={candySize}
                            showSymbol={showColorblindLabels}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600">
              <ArrowUp className="w-3.5 h-3.5 text-stone-500" />
              <span>Clears from bottom</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TabletopBoard({
  match,
  showColorblindLabels,
  reactions,
  onConfirmClear,
}: TabletopBoardProps) {
  const isRevealed = match.phase === 'gameover';
  const isTrueBlind = match.settings.visibilityMode === 'true-blind';
  const opponent = match.opponent;

  const selfIsWinner = match.winnerId === match.self.id;
  const opponentIsWinner = opponent ? match.winnerId === opponent.id : false;

  const pendingForSelf =
    match.pendingClear &&
    match.pendingClear.defenderId === match.self.id &&
    match.pendingClear.targetCandyIds
      ? new Set(match.pendingClear.targetCandyIds)
      : null;

  return (
    <div className="relative w-full">
      {/* Floating Emoji Reactions */}
      <div
        aria-live="polite"
        className="pointer-events-none absolute top-3 right-3 z-30 flex flex-col items-end gap-1.5"
      >
        <AnimatePresence>
          {reactions.map((rx) => (
            <motion.div
              key={rx.id}
              initial={{ opacity: 0, y: 12, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-stone-200 bg-white/95 px-3 py-1.5 shadow-md text-xs font-medium text-stone-800 flex items-center gap-1.5"
            >
              <span className="text-base">{rx.emoji}</span>
              <span>{rx.senderName}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Split Table: Left Mat | 3D Wooden Divider | Right Mat */}
      <div className="flex flex-col md:flex-row items-stretch gap-3 md:gap-0">
        <PlayerMat
          side="left"
          playerName={match.self.name}
          isSelf={true}
          isActiveTurn={
            match.phase === 'playing' &&
            match.pendingClear === null &&
            match.activeSeat === match.self.seat
          }
          isWinner={selfIsWinner}
          connected={match.self.connected}
          line={match.self.line}
          discarded={match.self.discarded}
          remainingCount={match.self.remainingCount}
          lineLength={match.settings.lineLength}
          showColorblindLabels={showColorblindLabels}
          revealed={true}
          isTrueBlind={isTrueBlind}
          pendingTargetIds={pendingForSelf}
          pendingCallerName={match.pendingClear?.callerName ?? null}
          pendingCalledColor={match.pendingClear?.calledColor ?? null}
          onConfirmClear={onConfirmClear}
        />

        {/* Stylized 3D Wooden Divider (lifts away smoothly on gameover!) */}
        <div className="order-2 relative flex items-center justify-center md:w-12 shrink-0 py-0.5 md:py-0">
          <AnimatePresence mode="wait">
            {!isRevealed ? (
              <motion.div
                key="divider-down"
                data-testid="wooden-divider"
                initial={{ opacity: 0, y: -24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -56, scaleY: 0.2 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-7 md:w-7 md:h-full rounded-xl wood-grain-horizontal md:wood-grain shadow-[0_8px_18px_rgba(68,40,18,0.36)] border border-amber-950/30 flex items-center justify-center relative overflow-hidden"
                aria-label="Wooden privacy divider standing between players"
              >
                <div className="w-12 h-2 md:w-2 md:h-16 rounded-full bg-amber-950/35 border border-amber-200/20" />
              </motion.div>
            ) : (
              <motion.div
                key="divider-lifted"
                data-testid="wooden-divider-lifted"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="flex md:flex-col items-center justify-center gap-1.5 px-3 py-1.5 md:px-1 md:py-3 rounded-xl border border-amber-300/80 bg-amber-50/90 text-amber-900 shadow-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider md:[writing-mode:vertical-rl] md:rotate-180">
                  Divider Lifted
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <PlayerMat
          side="right"
          playerName={opponent?.name ?? 'Opponent'}
          isSelf={false}
          isActiveTurn={
            match.phase === 'playing' &&
            !!opponent &&
            (match.pendingClear
              ? match.pendingClear.defenderId === opponent.id
              : match.activeSeat === opponent.seat)
          }
          isWinner={opponentIsWinner}
          connected={opponent?.connected ?? false}
          line={opponent?.line ?? null}
          discarded={opponent?.discarded ?? null}
          remainingCount={opponent?.remainingCount ?? null}
          lineLength={match.settings.lineLength}
          showColorblindLabels={showColorblindLabels}
          revealed={isRevealed}
          isTrueBlind={isTrueBlind}
          pendingTargetIds={null}
          pendingCallerName={null}
          pendingCalledColor={null}
        />
      </div>
    </div>
  );
}
