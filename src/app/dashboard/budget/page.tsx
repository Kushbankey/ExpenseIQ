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
    { label: 'Needs', actual: needsWants.need.pct, target: 50, amount: needsWants.need.amount, color: CLASSIFICATION_COLORS.Need },
    { label: 'Wants', actual: needsWants.want.pct, target: 30, amount: needsWants.want.amount, color: CLASSIFICATION_COLORS.Want },
    { label: 'Investments', actual: needsWants.investment.pct, target: 20, amount: needsWants.investment.amount, color: CLASSIFICATION_COLORS.Investment },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">50/30/20 Budget Rule</h1>
        <p className="text-sm text-gray-500 mt-1">Compare your spending against the recommended 50/30/20 rule</p>
      </div>

      <Card title="Actual vs Target">
        <BudgetComparisonChart data={needsWants} />
      </Card>

      {/* Gap Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {gaps.map((g) => {
          const diff = g.actual - g.target;
          const isOver = diff > 0;

          return (
            <div key={g.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                <h3 className="font-semibold text-gray-800">{g.label}</h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Actual</span>
                  <span className="font-bold" style={{ color: g.color }}>
                    {formatPercent(g.actual)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Target</span>
                  <span className="font-medium text-gray-600">{g.target}%</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                  <span className="text-gray-500">Gap</span>
                  <span className={`font-bold ${isOver ? 'text-red-500' : 'text-green-500'}`}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-medium text-gray-700">{formatINR(g.amount)}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(g.actual, 100)}%`,
                    backgroundColor: g.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
