'use client';

import { RefreshCw, Calendar } from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import type { RecurringExpense } from '@/lib/types';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function RecurringExpenses({ recurring }: { recurring: RecurringExpense[] }) {
  if (recurring.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {recurring.map((item, i) => (
        <div
          key={`${item.name}-${item.avgAmount}-${i}`}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <RefreshCw size={16} className="text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar size={10} />
                ~{ordinal(item.typicalDay)} of each month
              </p>
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-900 flex-shrink-0 ml-2">{formatINR(item.avgAmount)}</p>
        </div>
      ))}
    </div>
  );
}
