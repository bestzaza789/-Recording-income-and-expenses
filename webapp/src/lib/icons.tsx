import {
  ShoppingCart, Car, Home, UtensilsCrossed, Zap, Heart, Stethoscope,
  Gift, ShoppingBag, Plane, Banknote, CreditCard, ArrowLeftRight,
  DollarSign, type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  car: Car,
  house: Home,
  utensils: UtensilsCrossed,
  zap: Zap,
  heart: Heart,
  stethoscope: Stethoscope,
  gift: Gift,
  bag: ShoppingBag,
  plane: Plane,
  banknote: Banknote,
  'credit-card': CreditCard,
};

export const ICON_NAMES = Object.keys(CATEGORY_ICONS);

/** A category's iconName may be an emoji sticker ("emoji:🍜") instead of a lucide icon key. */
export const EMOJI_PREFIX = 'emoji:';
export const CATEGORY_EMOJIS = ['🍜', '☕', '🚌', '🛍️', '🏠', '💡', '💊', '🎬', '🎮', '📚', '🐶', '💼', '🎁', '✈️', '💰', '🧾'];

export function CategoryIcon({ name, size = 20, color }: { name?: string; size?: number; color?: string }) {
  if (name?.startsWith(EMOJI_PREFIX)) {
    return <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1 }}>{name.slice(EMOJI_PREFIX.length)}</span>;
  }
  const Icon = (name && CATEGORY_ICONS[name]) || DollarSign;
  return <Icon size={size} color={color} />;
}

export function TransferIcon({ size = 20, color }: { size?: number; color?: string }) {
  return <ArrowLeftRight size={size} color={color} />;
}
