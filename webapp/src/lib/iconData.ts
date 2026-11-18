import {
  ShoppingCart, Car, Home, UtensilsCrossed, Zap, Heart, Stethoscope,
  Gift, ShoppingBag, Plane, Banknote, CreditCard,
  type LucideIcon,
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
