import { CANDY_COLOR_META } from '../game/constants.ts';
import type { CandyColor } from '../game/types.ts';

interface CandyTokenProps {
  color: CandyColor;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showSymbol?: boolean;
  isBottom?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<CandyTokenProps['size']>, string> = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
};

export function CandyToken({
  color,
  size = 'md',
  showSymbol = false,
  isBottom = false,
  className = '',
}: CandyTokenProps) {
  const meta = CANDY_COLOR_META[color];

  return (
    <span
      role="img"
      aria-label={`${meta.label} candy`}
      className={`relative inline-flex items-center justify-center rounded-full select-none shrink-0 font-bold ${SIZE_CLASSES[size]} ${
        isBottom ? 'ring-2 ring-stone-900/35 ring-offset-1 ring-offset-amber-50' : ''
      } ${className}`}
      style={{
        background: `radial-gradient(circle at 32% 28%, ${meta.highlightHex} 0%, ${meta.hex} 46%, ${meta.darkHex} 100%)`,
        boxShadow:
          '0 4px 8px -2px rgba(28, 25, 23, 0.28), inset 0 -2px 4px rgba(0, 0, 0, 0.22), inset 0 2px 3px rgba(255, 255, 255, 0.45)',
        color: meta.textColor,
      }}
    >
      {/* Glossy top-left specular crescent */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[14%] left-[18%] w-[36%] h-[22%] rounded-full opacity-75 -rotate-25"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0) 100%)',
        }}
      />
      {showSymbol ? (
        <span className="relative z-10 leading-none tracking-tight drop-shadow-xs">
          {meta.shortCode}
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="relative z-10 text-[9px] font-semibold opacity-40 leading-none"
        >
          s
        </span>
      )}
    </span>
  );
}
