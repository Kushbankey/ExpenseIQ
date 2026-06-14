'use client';

import { useEffect, useMemo, Suspense } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUserSettings } from '@/store/useUserSettings';
import { Card } from '@/components/ui/Card';
import { Tabs, useActiveTab, type TabDef } from '@/components/ui/Tabs';
import { BudgetComparisonChart } from '@/components/charts/BudgetComparison';
import { CategoryBudgetRow } from '@/components/dashboard/CategoryBudgetRow';
import { LastMonthReport } from '@/components/dashboard/LastMonthReport';
import { BudgetSummaryCard } from '@/components/dashboard/BudgetSummaryCard';
import { formatINR, formatPercent } from '@/lib/formatters';
import { CLASSIFICATION_COLORS } from '@/lib/constants';
import { computeCategoryBudgetStatuses } from '@/lib/analytics/categoryBudget';

const TABS: TabDef[] = [
  { value: 'rule', label: 'Rule of thumb' },
  { value: 'per-category', label: 'Per-category' },
];

// Top-level page is a thin wrapper — the inner component reads useSearchParams,
// which Next 16 wants inside a Suspense boundary for streaming.
export default function BudgetPage() {
  return (
    <Suspense fallback={<BudgetPageSkeleton />}>
      <BudgetPageInner />
    </Suspense>
  );
}

function BudgetPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Budget</h1>
      </div>
      <div className="h-9 w-64 bg-gray-100 dark:bg-gray-800/60 rounded-xl animate-pulse" />
      <div className="h-48 bg-gray-100 dark:bg-gray-800/60 rounded-2xl animate-pulse" />
    </div>
  );
}

function BudgetPageInner() {
  const data = useFinanceStore((s) => s.data);
  const active = useActiveTab(TABS, 'tab', 'rule');

  // Hydrate user settings on mount. No-op if already hydrated.
  useEffect(() => {
    useUserSettings.getState().hydrate();
  }, []);

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Budget</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {active === 'rule'
            ? 'Share of income going to Needs, Wants, and Savings (investments + cash buffer)'
            : 'Per-category monthly limits. Edits affect this month onward — past months keep their own historical limit.'}
        </p>
      </div>

      <Tabs tabs={TABS} defaultValue="rule" />

      {active === 'rule' && <RuleOfThumbTab />}
      {active === 'per-category' && <PerCategoryTab />}
    </div>
  );
}

// =========================================================================
// Tab 1 — existing 50/30/20 view, untouched.
// =========================================================================
function RuleOfThumbTab() {
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
      <Card title="Actual vs Target">
        <BudgetComparisonChart data={needsWants} />
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {gaps.map((g) => {
          const diff = g.actual - g.target;
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
                  <span className="font-bold" style={{ color: g.color }}>{formatPercent(g.actual)}</span>
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
              <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(Math.max(g.actual, 0), 100)}%`, backgroundColor: g.color }}
                />
              </div>
              {g.sub && <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{g.sub}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================================
// Tab 2 — Per-category budgets.
// =========================================================================
function PerCategoryTab() {
  const data = useFinanceStore((s) => s.data);
  const budgets = useUserSettings((s) => s.budgets);
  const isHydrated = useUserSettings((s) => s.isHydrated);
  const isHydrating = useUserSettings((s) => s.isHydrating);
  const upsertBudget = useUserSettings((s) => s.upsertBudget);
  const deleteBudget = useUserSettings((s) => s.deleteBudget);
  const setBudgetKind = useUserSettings((s) => s.setBudgetKind);

  const statuses = useMemo(() => {
    if (!data) return [];
    return computeCategoryBudgetStatuses(data.expenses, budgets, data.categoryAnalysis);
  }, [data, budgets]);

  const budgeted = statuses.filter((s) => s.monthlyLimit !== null);
  const unbudgeted = statuses
    .filter((s) => s.monthlyLimit === null)
    .sort((a, b) => b.spent - a.spent);

  if (!data) return null;

  if (isHydrating && !isHydrated) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800/60 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aggregate summary — only renders when ≥1 budget exists */}
      <BudgetSummaryCard statuses={statuses} avgMonthlyIncome={data.summary.avgMonthlyIncome} />

      {/* Section A — budgeted categories with live status */}
      <Card title={`Budgeted · ${budgeted.length}`}>
        {budgeted.length === 0 ? (
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              No budgets set yet. Pick a category below to get started — we&apos;ll show your progress live.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {budgeted.map((s) => (
              <CategoryBudgetRow
                key={s.category}
                status={s}
                onSave={upsertBudget}
                onDelete={deleteBudget}
                onKindChange={setBudgetKind}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Section B — set a budget for categories you spend on */}
      {unbudgeted.length > 0 && (
        <Card title="Set a budget">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Categories you spend on but haven&apos;t set a limit for. Type a number and press Enter or click away to save.
          </p>
          <div className="space-y-2">
            {unbudgeted.slice(0, 10).map((s) => (
              <CategoryBudgetRow
                key={s.category}
                status={s}
                onSave={upsertBudget}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Section C — last-month report card */}
      <Card title="Last month report">
        <LastMonthReport statuses={statuses} />
      </Card>
    </div>
  );
}
