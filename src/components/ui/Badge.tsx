'use client';

import { CLASSIFICATION_COLORS } from '@/lib/constants';
import type { Classification } from '@/lib/types';

const BADGE_COLORS: Record<Classification | 'Income', string> = {
  ...CLASSIFICATION_COLORS,
  Income: '#22c55e',
};

export function Badge({ classification }: { classification: Classification | 'Income' }) {
  const color = BADGE_COLORS[classification];
  return (
    <span
      className="text-xs font-medium px-2.5 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {classification}
    </span>
  );
}
