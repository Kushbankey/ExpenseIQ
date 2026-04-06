'use client';

import { formatINR } from '@/lib/formatters';
import { CATEGORY_COLORS } from '@/lib/constants';
import type { CategoryTotal } from '@/lib/types';

export function CategoryBreakdownList({ categories, limit = 8 }: { categories: CategoryTotal[]; limit?: number }) {
  const displayed = categories.slice(0, limit);
  const maxTotal = displayed[0]?.total || 1;

  return (
    <div className="space-y-3">
      {displayed.map((cat) => {
        const pct = (cat.total / maxTotal) * 100;
        const color = CATEGORY_COLORS[cat.category] || '#6b7280';

        return (
          <div key={cat.category} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]">
                {cat.category}
              </span>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900">{formatINR(cat.total)}</span>
                <span className="text-xs text-gray-400 ml-2">{cat.count} txns</span>
              </div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
