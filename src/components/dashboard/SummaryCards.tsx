'use client';

import { TrendingUp, ShoppingBag, PiggyBank, BarChart3 } from 'lucide-react';
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
        label="Spending"
        value={formatINR(summary.totalSpending)}
        sublabel={`Avg ${formatINR(summary.avgMonthlySpending)}/mo · Needs + Wants`}
        icon={<ShoppingBag size={20} />}
        color="#ef4444"
      />
      <StatCard
        label="Investments"
        value={formatINR(summary.investments)}
        sublabel={`${summary.investmentShareOfIncome.toFixed(0)}% of income`}
        icon={<BarChart3 size={20} />}
        color="#10b981"
      />
      <StatCard
        label="Savings"
        value={formatINR(summary.totalSavings)}
        sublabel={`Rate ${summary.savingsRate.toFixed(1)}% · Cash ${formatINR(summary.cashSavings)}`}
        icon={<PiggyBank size={20} />}
        color={summary.totalSavings >= 0 ? '#8b5cf6' : '#ef4444'}
      />
    </div>
  );
}
