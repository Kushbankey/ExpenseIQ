'use client';

import { useFinanceStore } from '@/store/useFinanceStore';
import { Card } from '@/components/ui/Card';
import { MonthlyIncomeExpenseChart } from '@/components/charts/MonthlyIncomeExpense';
import { SavingsRateChart } from '@/components/charts/SavingsRateTrend';
import { NeedsWantsStackedChart } from '@/components/charts/NeedsWantsChart';

export default function TrendsPage() {
  const data = useFinanceStore((s) => s.data);
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trends</h1>
        <p className="text-sm text-gray-500 mt-1">Monthly spending and savings patterns</p>
      </div>

      <Card title="Monthly Income vs Expense">
        <MonthlyIncomeExpenseChart data={data.monthlyTrends} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Savings Rate">
          <SavingsRateChart data={data.monthlyTrends} />
        </Card>

        <Card title="Needs / Wants / Investments">
          <NeedsWantsStackedChart data={data.monthlyClassification} />
        </Card>
      </div>
    </div>
  );
}
