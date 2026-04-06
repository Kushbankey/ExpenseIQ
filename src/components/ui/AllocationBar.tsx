'use client';

import { CLASSIFICATION_COLORS } from '@/lib/constants';
import type { NeedsWantsResult } from '@/lib/types';
import { formatINR, formatPercent } from '@/lib/formatters';

interface AllocationBarProps {
  data: NeedsWantsResult;
}

export function AllocationBar({ data }: AllocationBarProps) {
  const segments = [
    { key: 'Needs', ...data.need, color: CLASSIFICATION_COLORS.Need },
    { key: 'Wants', ...data.want, color: CLASSIFICATION_COLORS.Want },
    { key: 'Investments', ...data.investment, color: CLASSIFICATION_COLORS.Investment },
  ];

  return (
    <div>
      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-4">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="transition-all duration-500"
            style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-3">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: seg.color }} />
              <div>
                <p className="text-sm font-semibold text-gray-900">{seg.key}</p>
                <p className="text-xs text-gray-400">
                  {formatPercent(seg.pct)} of total
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: seg.color }}>
                {formatINR(seg.amount)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
