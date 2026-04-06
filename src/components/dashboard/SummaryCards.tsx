'use client';

import { TrendingUp, TrendingDown, PiggyBank, BarChart3 } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { formatINR } from '@/lib/formatters';
import type { SummaryStats } from '@/lib/types';

export function SummaryCards({ summary }: { summary: SummaryStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Income"
        value={formatINR(summary.totalIncome)}
        sublabel={`Salary: ${formatINR(summary.salaryIncome)}`}
        icon={<TrendingUp size={20} />}
        color="#22c55e"
      />
      <StatCard
        label="Total Expenses"
        value={formatINR(summary.totalExpense)}
        sublabel={`Avg ${formatINR(summary.avgMonthlyExpense)}/mo`}
        icon={<TrendingDown size={20} />}
        color="#ef4444"
      />
      <StatCard
        label="Investments"
        value={formatINR(summary.investments)}
        sublabel={`${((summary.investments / summary.totalExpense) * 100).toFixed(0)}% of expenses`}
        icon={<BarChart3 size={20} />}
        color="#10b981"
      />
      <StatCard
        label="Net Savings"
        value={formatINR(summary.netSavings)}
        sublabel={`Savings rate: ${summary.savingsRate.toFixed(1)}%`}
        icon={<PiggyBank size={20} />}
        color={summary.netSavings >= 0 ? '#8b5cf6' : '#ef4444'}
      />
    </div>
  );
}
