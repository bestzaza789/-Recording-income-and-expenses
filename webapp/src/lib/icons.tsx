import { ArrowLeftRight, DollarSign } from 'lucide-react';
import { CATEGORY_ICONS, EMOJI_PREFIX } from './iconData';

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
