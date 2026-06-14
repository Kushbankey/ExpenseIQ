'use client';

import type { CategoryBudgetStatus } from '@/lib/types';
import { formatINR } from '@/lib/formatters';

interface LastMonthReportProps {
  statuses: CategoryBudgetStatus[];
}

// Last-month report card: for each category that had a budget set in the
// previous month, show whether the user stayed under it. Reads the
// historically-effective limit (not the current limit), so changing budgets
// mid-month doesn't retro-rewrite the past.
export function LastMonthReport({ statuses }: LastMonthReportProps) {
  // For ceiling rows, "good" = under limit. For target rows, "good" = at-or-
  // over the target. We can't read the prior-month kind from history, so use
  // the current kind as a proxy — accurate as long as the user doesn't flip
  // a category's kind mid-history.
  const rows = statuses
    .filter((s) => s.lastMonthLimit !== null && s.lastMonthLimit > 0)
    .map((s) => {
      const limit = s.lastMonthLimit!;
      const spent = s.lastMonthSpent;
      const delta = spent - limit;
      const isTarget = s.kind === 'target';
      const succeeded = isTarget ? spent >= limit : spent <= limit;
      return { category: s.category, kind: s.kind, limit, spent, delta, isTarget, succeeded };
    })
    // Failures first (red on top), then sort by absolute spend within.
    .sort((a, b) => Number(b.succeeded) - Number(a.succeeded) === 0
      ? b.spent - a.spent
      : Number(a.succeeded) - Number(b.succeeded));

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No budgets were active last month yet — once you set some this month, next month&apos;s report will land here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        // Delta text reads naturally per kind:
        //   ceiling success → "−₹500" (under limit, good)
        //   ceiling fail    → "+₹300" (over limit, bad)
        //   target  success → "+₹500" (exceeded target, good)
        //   target  fail    → "−₹2,000" (missed target, bad)
        const deltaText = r.isTarget
          ? (r.delta >= 0 ? `+${formatINR(r.delta)}` : `-${formatINR(-r.delta)}`)
          : (r.delta > 0 ? `+${formatINR(r.delta)}` : `-${formatINR(-r.delta)}`);
        return (
          <div
            key={r.category}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/40"
          >
            <div className="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-gray-200">
              <span className="mr-2">{r.succeeded ? '✓' : '✗'}</span>
              {r.category}
              {r.isTarget && (
                <span className="ml-2 text-[10px] uppercase text-gray-400 dark:text-gray-500">target</span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mr-3 whitespace-nowrap">
              {formatINR(r.spent)} / {formatINR(r.limit)}
            </div>
            <div className={`text-sm font-medium whitespace-nowrap ${r.succeeded ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-500 dark:text-red-300'}`}>
              {deltaText}
            </div>
          </div>
        );
      })}
    </div>
  );
}
