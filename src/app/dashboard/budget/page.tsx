'use client';

import { useFinanceStore } from '@/store/useFinanceStore';
import { Card } from '@/components/ui/Card';
import { BudgetComparisonChart } from '@/components/charts/BudgetComparison';
import { formatINR, formatPercent } from '@/lib/formatters';
import { CLASSIFICATION_COLORS } from '@/lib/constants';

export default function BudgetPage() {
  const data = useFinanceStore((s) => s.data);
  if (!data) return null;

  const { needsWants } = data;
  const gaps = [
    { label: 'Needs', actual: needsWants.need.pct, target: 50, amount: needsWants.need.amount, color: CLASSIFICATION_COLORS.Need, sub: null },
    { label: 'Wants', actual: needsWants.want.pct, target: 30, amount: needsWants.want.amount, color: CLASSIFICATION_COLORS.Want, sub: null },
    {
      label: 'Savings',
      actual: needsWants.savings.pct,
      target: 20,
      amount: needsWants.savings.amount,
      color: CLASSIFICATION_COLORS.Investment,
      sub: `Invested ${formatINR(needsWants.savings.breakdown.investments)} · Cash ${formatINR(needsWants.savings.breakdown.cash)}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">50/30/20 Budget Rule</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Share of income going to Needs, Wants, and Savings (investments + cash buffer)</p>
      </div>

      <Card title="Actual vs Target">
        <BudgetComparisonChart data={needsWants} />
      </Card>

      {/* Gap Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {gaps.map((g) => {
          const diff = g.actual - g.target;
          // For Needs/Wants, over-target is bad. For Savings, over-target is good.
          const overIsGood = g.label === 'Savings';
          const gapIsHealthy = overIsGood ? diff >= 0 : diff <= 0;

          return (
            <div key={g.label} className="bg-white dark:bg-[#131316] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800/80 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">{g.label}</h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Actual</span>
                  <span className="font-bold" style={{ color: g.color }}>
                    {formatPercent(g.actual)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Target</span>
                  <span className="font-medium text-gray-600 dark:text-gray-300">{g.target}%</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-100 dark:border-gray-800/80 pt-2">
                  <span className="text-gray-500 dark:text-gray-400">Gap</span>
                  <span className={`font-bold ${gapIsHealthy ? 'text-green-500 dark:text-emerald-300' : 'text-red-500 dark:text-red-300'}`}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Amount</span>
                  <span className="font-medium text-gray-700 dark:text-gray-200">{formatINR(g.amount)}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(Math.max(g.actual, 0), 100)}%`,
                    backgroundColor: g.color,
                  }}
                />
              </div>

              {g.sub && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{g.sub}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
