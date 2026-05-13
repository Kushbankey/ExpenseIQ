'use client';

import { useFinanceStore } from '@/store/useFinanceStore';
import { Card } from '@/components/ui/Card';
import { AllocationBar } from '@/components/ui/AllocationBar';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { ProjectionCard } from '@/components/dashboard/ProjectionCard';
import { RunwayCard } from '@/components/dashboard/RunwayCard';
import { CategoryBreakdownList } from '@/components/dashboard/CategoryBreakdownList';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { RecurringExpenses } from '@/components/dashboard/RecurringExpenses';
import { InvestmentTracker } from '@/components/dashboard/InvestmentTracker';
import { SpendingLineChart } from '@/components/charts/SpendingLineChart';
import { IncomeSankey } from '@/components/charts/IncomeSankey';
import { PortfolioMix } from '@/components/charts/PortfolioMix';
import Link from 'next/link';

export default function OverviewPage() {
  const data = useFinanceStore((s) => s.data);
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data.summary.dateRange} &middot; {data.summary.numTransactions.toLocaleString()} transactions</p>
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={data.summary} />

      {/* Row 2: Projection + Runway */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <ProjectionCard projection={data.projection} />
        <RunwayCard projection={data.projection} />
      </div>

      {/* Row 3: Allocation + Spending Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Allocation">
          <AllocationBar data={data.needsWants} />
          <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800/60">
            <CategoryBreakdownList categories={data.categoryAnalysis} limit={4} />
          </div>
        </Card>

        <Card
          title="Spending This Month"
          action={
            <Link href="/dashboard/trends" className="text-xs text-violet-600 dark:text-violet-300 font-medium hover:underline">
              See all &rsaquo;
            </Link>
          }
        >
          <SpendingLineChart expenses={data.expenses} />
        </Card>
      </div>

      {/* Row 3: Investments | Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Monthly SIPs"
          action={
            <Link href="/dashboard/insights" className="text-xs text-violet-600 dark:text-violet-300 font-medium hover:underline">
              See all &rsaquo;
            </Link>
          }
        >
          <InvestmentTracker data={data.insights.investmentPattern} />
        </Card>

        <Card
          title="Recent Transactions"
          action={
            <Link href="/dashboard/transactions" className="text-xs text-violet-600 dark:text-violet-300 font-medium hover:underline">
              See all &rsaquo;
            </Link>
          }
        >
          <RecentTransactions transactions={data.expenses} />
        </Card>
      </div>

      {/* Row 4: Income flow Sankey */}
      <Card title="Where Your Money Flows">
        <IncomeSankey data={data.sankey} />
      </Card>

      {/* Row 5: Portfolio Mix + Recurring Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Investment Mix">
          <PortfolioMix portfolio={data.portfolio} />
        </Card>

        <Card
          title="Recurring Expenses"
          action={
            <Link href="/dashboard/insights" className="text-xs text-violet-600 dark:text-violet-300 font-medium hover:underline">
              See all &rsaquo;
            </Link>
          }
        >
          <RecurringExpenses recurring={data.recurring} />
        </Card>
      </div>
    </div>
  );
}
