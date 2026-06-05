import {
  Tag,
  Sparkles,
  Battery,
  Watch,
  Ruler,
  Scissors,
  Gem,
  Gift,
  Wrench,
  Hammer,
  Crown,
  Award,
  ShoppingBag,
  Star,
  Droplet,
  Cog,
  Package,
  Coins,
  BadgePercent,
  Heart,
  type LucideIcon,
} from 'lucide-react';

// Curated icon set offered in the tile maker. Stored by string key on the tile.
export const TILE_ICONS: Record<string, LucideIcon> = {
  Tag,
  Sparkles,
  Battery,
  Watch,
  Ruler,
  Scissors,
  Gem,
  Gift,
  Wrench,
  Hammer,
  Crown,
  Award,
  ShoppingBag,
  Star,
  Droplet,
  Cog,
  Package,
  Coins,
  BadgePercent,
  Heart,
};

export const TILE_ICON_KEYS = Object.keys(TILE_ICONS);

export function getTileIcon(key: string): LucideIcon {
  return TILE_ICONS[key] ?? Tag;
}

export interface TileColorStyle {
  /** Resting tile container classes (matches existing service-tile look). */
  tile: string;
  /** Icon colour. */
  icon: string;
  /** Title colour. */
  title: string;
  /** Subtitle colour. */
  subtitle: string;
  /** Small swatch used in the colour picker. */
  swatch: string;
}

// Tailwind class strings are written out in full so the JIT compiler keeps them.
export const TILE_COLORS: Record<string, TileColorStyle> = {
  blue: {
    tile: 'bg-blue-50/60 border border-blue-100 hover:border-blue-300 hover:bg-blue-50',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    subtitle: 'text-blue-500',
    swatch: 'bg-blue-500',
  },
  green: {
    tile: 'bg-green-50/60 border border-green-100 hover:border-green-300 hover:bg-green-50',
    icon: 'text-green-600',
    title: 'text-green-900',
    subtitle: 'text-green-500',
    swatch: 'bg-green-500',
  },
  amber: {
    tile: 'bg-amber-50/60 border border-amber-100 hover:border-amber-300 hover:bg-amber-50',
    icon: 'text-amber-600',
    title: 'text-amber-900',
    subtitle: 'text-amber-500',
    swatch: 'bg-amber-500',
  },
  purple: {
    tile: 'bg-purple-50/60 border border-purple-100 hover:border-purple-300 hover:bg-purple-50',
    icon: 'text-purple-600',
    title: 'text-purple-900',
    subtitle: 'text-purple-500',
    swatch: 'bg-purple-500',
  },
  pink: {
    tile: 'bg-pink-50/60 border border-pink-100 hover:border-pink-300 hover:bg-pink-50',
    icon: 'text-pink-600',
    title: 'text-pink-900',
    subtitle: 'text-pink-500',
    swatch: 'bg-pink-500',
  },
  rose: {
    tile: 'bg-rose-50/60 border border-rose-100 hover:border-rose-300 hover:bg-rose-50',
    icon: 'text-rose-600',
    title: 'text-rose-900',
    subtitle: 'text-rose-500',
    swatch: 'bg-rose-500',
  },
  teal: {
    tile: 'bg-teal-50/60 border border-teal-100 hover:border-teal-300 hover:bg-teal-50',
    icon: 'text-teal-600',
    title: 'text-teal-900',
    subtitle: 'text-teal-500',
    swatch: 'bg-teal-500',
  },
  indigo: {
    tile: 'bg-indigo-50/60 border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50',
    icon: 'text-indigo-600',
    title: 'text-indigo-900',
    subtitle: 'text-indigo-500',
    swatch: 'bg-indigo-500',
  },
  slate: {
    tile: 'bg-slate-50/60 border border-slate-200 hover:border-slate-300 hover:bg-slate-50',
    icon: 'text-slate-600',
    title: 'text-slate-900',
    subtitle: 'text-slate-500',
    swatch: 'bg-slate-500',
  },
};

export const TILE_COLOR_KEYS = Object.keys(TILE_COLORS);

export function getTileColor(key: string): TileColorStyle {
  return TILE_COLORS[key] ?? TILE_COLORS.blue;
}

// Header gradient (and solid accent) for the price dialog, keyed by colour.
export const TILE_GRADIENTS: Record<string, { gradient: string; solid: string }> = {
  blue: { gradient: 'from-blue-500 to-blue-600', solid: 'bg-blue-500' },
  green: { gradient: 'from-green-500 to-emerald-600', solid: 'bg-green-500' },
  amber: { gradient: 'from-amber-500 to-amber-600', solid: 'bg-amber-500' },
  purple: { gradient: 'from-purple-500 to-violet-600', solid: 'bg-purple-500' },
  pink: { gradient: 'from-pink-500 to-rose-500', solid: 'bg-pink-500' },
  rose: { gradient: 'from-rose-500 to-rose-600', solid: 'bg-rose-500' },
  teal: { gradient: 'from-teal-500 to-teal-600', solid: 'bg-teal-500' },
  indigo: { gradient: 'from-indigo-500 to-indigo-600', solid: 'bg-indigo-500' },
  slate: { gradient: 'from-slate-500 to-slate-600', solid: 'bg-slate-500' },
};

export function getTileGradient(key: string): { gradient: string; solid: string } {
  return TILE_GRADIENTS[key] ?? TILE_GRADIENTS.blue;
}
