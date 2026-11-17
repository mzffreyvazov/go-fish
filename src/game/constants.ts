import type { CandyColor, LineLength } from './types.ts';

export const CANDY_COLORS: readonly CandyColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'purple',
] as const;

export const LINE_LENGTH_OPTIONS: readonly LineLength[] = [12, 18, 24] as const;

export interface CandyColorMeta {
  color: CandyColor;
  label: string;
  shortCode: string;
  symbol: string;
  hex: string;
  darkHex: string;
  highlightHex: string;
  textColor: string;
  ringClass: string;
}

export const CANDY_COLOR_META: Record<CandyColor, CandyColorMeta> = {
  red: {
    color: 'red',
    label: 'Red',
    shortCode: 'R',
    symbol: '▲',
    hex: '#e11d48',
    darkHex: '#9f1239',
    highlightHex: '#fda4af',
    textColor: '#ffffff',
    ringClass: 'ring-rose-500/40',
  },
  orange: {
    color: 'orange',
    label: 'Orange',
    shortCode: 'O',
    symbol: '◆',
    hex: '#f97316',
    darkHex: '#c2410c',
    highlightHex: '#fed7aa',
    textColor: '#ffffff',
    ringClass: 'ring-orange-500/40',
  },
  yellow: {
    color: 'yellow',
    label: 'Yellow',
    shortCode: 'Y',
    symbol: '★',
    hex: '#eab308',
    darkHex: '#a16207',
    highlightHex: '#fef08a',
    textColor: '#422006',
    ringClass: 'ring-yellow-500/50',
  },
  green: {
    color: 'green',
    label: 'Green',
    shortCode: 'G',
    symbol: '●',
    hex: '#16a34a',
    darkHex: '#166534',
    highlightHex: '#bbf7d0',
    textColor: '#ffffff',
    ringClass: 'ring-green-500/40',
  },
  purple: {
    color: 'purple',
    label: 'Purple',
    shortCode: 'P',
    symbol: '■',
    hex: '#7c3aed',
    darkHex: '#5b21b6',
    highlightHex: '#ddd6fe',
    textColor: '#ffffff',
    ringClass: 'ring-violet-500/40',
  },
};

export const REACTION_PRESETS = [
  { emoji: '🐟', label: 'Go Fish!' },
  { emoji: '😱', label: 'Whoa!' },
  { emoji: '🍬', label: 'Sweet!' },
  { emoji: '🎯', label: 'Bullseye!' },
  { emoji: '😅', label: 'Close!' },
  { emoji: '👏', label: 'Nice!' },
] as const;
