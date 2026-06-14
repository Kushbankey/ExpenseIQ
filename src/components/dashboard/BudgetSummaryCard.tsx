'use client';

import type { CategoryBudgetStatus, BudgetKind } from '@/lib/types';
import { formatINR, formatCompactINR } from '@/lib/formatters';

interface BudgetSummaryCardProps {
  statuses: CategoryBudgetStatus[];
  avgMonthlyIncome: number; // 0 if no income data
}

// Top-of-page summary. Spending and investing are kept conceptually distinct:
// each kind gets its own panel with its own headline number, progress bar and
// pass/fail colour. The total commitment is shown only as a footer line — it's
// useful for cash-flow planning but shouldn't be the headline (that would
// imply investments are "spent", which they aren't).
export function BudgetSummaryCard({ statuses, avgMonthlyIncome }: BudgetSummaryCardProps) {
  const budgeted = statuses.filter((s) => s.monthlyLimit !== null);
  if (budgeted.length === 0) return null;

  const ceilings = budgeted.filter((s) => s.kind === 'ceiling');
  const targets  = budgeted.filter((s) => s.kind === 'target');

  const ceilingLimit = ceilings.reduce((s, b) => s + (b.monthlyLimit ?? 0), 0);
  const ceilingUsed  = ceilings.reduce((s, b) => s + b.spent, 0);
  const targetLimit  = targets.reduce((s, b) => s + (b.monthlyLimit ?? 0), 0);
  const targetUsed   = targets.reduce((s, b) => s + b.spent, 0);

  const totalBudgeted     = ceilingLimit + targetLimit;
  const totalSpentAll     = statuses.reduce((s, b) => s + b.spent, 0);
  const totalSpentBudget  = ceilingUsed + targetUsed;
  const totalUnbudgeted   = totalSpentAll - totalSpentBudget;

  // Use any row to grab days-of-month info — they all share the same as-of date.
  const ref = budgeted[0];
  const daysRemaining = Math.max(0, ref.daysInMonth - ref.daysElapsed);

  const showBoth = ceilings.length > 0 && targets.length > 0;

  return (
    <div className="bg-white dark:bg-[#131316] rounded-2xl border border-gray-100 dark:border-gray-800/80 p-5">
      <div className={showBoth ? 'grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8' : ''}>
        {ceilings.length > 0 && (
          <SummaryPanel
            kind="ceiling"
            title="Spending budget"
            total={ceilingLimit}
            used={ceilingUsed}
            categoryCount={ceilings.length}
            avgMonthlyIncome={avgMonthlyIncome}
            daysElapsed={ref.daysElapsed}
            daysInMonth={ref.daysInMonth}
            daysRemaining={daysRemaining}
          />
        )}
        {targets.length > 0 && (
          <SummaryPanel
            kind="target"
            title="Investment target"
            total={targetLimit}
            used={targetUsed}
            categoryCount={targets.length}
            avgMonthlyIncome={avgMonthlyIncome}
            daysElapsed={ref.daysElapsed}
            daysInMonth={ref.daysInMonth}
            daysRemaining={daysRemaining}
          />
        )}
      </div>

      {/* Footer — only when both kinds are in play OR there's unbudgeted spend
          worth surfacing. Total commitment is for cash-flow framing, not a
          performance metric. */}
      {(showBoth || totalUnbudgeted > 0) && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 flex-wrap gap-x-3 gap-y-1">
          {showBoth ? (
            <span>
              Total monthly commitment <strong className="text-gray-700 dark:text-gray-200">{formatINR(totalBudgeted)}</strong>
              {avgMonthlyIncome > 0 && (
                <> · {((totalBudgeted / avgMonthlyIncome) * 100).toFixed(0)}% of avg income</>
              )}
            </span>
          ) : <span />}
          {totalUnbudgeted > 0 && (
            <span title="Spend in categories you haven't set a budget for">
              +{formatCompactINR(totalUnbudgeted)} unbudgeted spend
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SummaryPanel — one block per kind. Colours flip semantically per kind.
// =========================================================================
interface SummaryPanelProps {
  kind: BudgetKind;
  title: string;
  total: number;
  used: number;
  categoryCount: number;
  avgMonthlyIncome: number;
  daysElapsed: number;
  daysInMonth: number;
  daysRemaining: number;
}

function SummaryPanel({
  kind, title, total, used, categoryCount, avgMonthlyIncome,
  daysElapsed, daysInMonth, daysRemaining,
}: SummaryPanelProps) {
  const pctUsed = total > 0 ? (used / total) * 100 : 0;
  const incomeShare = avgMonthlyIncome > 0 ? (total / avgMonthlyIncome) * 100 : 0;
  const remaining = total - used;
  const linearPaceShouldBe = (total * daysElapsed) / daysInMonth;
  const aheadOrBehind = used - linearPaceShouldBe;

  // Bar colour: for ceiling, over/near-over is red/amber. For target,
  // achieved-or-on-track is green; behind is amber; missed-near-end is red.
  let barColor: string;
  let statusLabel: string;
  if (kind === 'ceiling') {
    if (pctUsed > 100) { barColor = 'bg-red-500'; statusLabel = 'Over'; }
    else if (pctUsed >= 80) { barColor = 'bg-amber-500'; statusLabel = 'Watch'; }
    else { barColor = 'bg-emerald-500'; statusLabel = 'On pace'; }
  } else {
    if (used >= total) { barColor = 'bg-emerald-500'; statusLabel = 'Achieved'; }
    else if (daysRemaining > 5 || pctUsed >= 80) {
      barColor = 'bg-emerald-500';
      statusLabel = daysRemaining > 5 ? 'On track' : 'Catching up';
    }
    else if (daysRemaining <= 2) { barColor = 'bg-red-500'; statusLabel = 'Missed'; }
    else { barColor = 'bg-amber-500'; statusLabel = 'Behind'; }
  }

  const usedVerb     = kind === 'target' ? 'invested' : 'spent';
  const remainVerb   = kind === 'target' ? 'to go' : 'left';

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {title}
        </h3>
        <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {statusLabel}
        </span>
      </div>

      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {formatINR(total)}
      </div>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        {categoryCount} {categoryCount === 1 ? 'category' : 'categories'}
        {avgMonthlyIncome > 0 && <> · {incomeShare.toFixed(0)}% of avg income</>}
      </p>

      {/* Progress bar */}
      <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800/60 rounded-full overflow-hidden relative">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${Math.min(100, pctUsed)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-gray-400 dark:bg-gray-500"
          style={{ left: `${Math.min(100, (daysElapsed / daysInMonth) * 100)}%` }}
          title="Linear pace marker"
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 flex-wrap gap-x-3">
        <span>
          {formatCompactINR(used)} {usedVerb} ({pctUsed.toFixed(0)}%)
        </span>
        <span>
          {remaining >= 0
            ? <>{formatCompactINR(remaining)} {remainVerb}</>
            : kind === 'ceiling'
              ? <span className="text-red-500 dark:text-red-300">over by {formatCompactINR(-remaining)}</span>
              : <span className="text-emerald-600 dark:text-emerald-300">+{formatCompactINR(-remaining)} over target</span>}
        </span>
      </div>

      {/* Pace verdict — useful nudge under the bar */}
      <div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
        {kind === 'ceiling'
          ? (Math.abs(aheadOrBehind) < 50
              ? 'On pace with the month'
              : aheadOrBehind > 0
                ? `${formatCompactINR(aheadOrBehind)} ahead of linear pace`
                : `${formatCompactINR(-aheadOrBehind)} under linear pace`)
          : (remaining > 0 && daysRemaining > 0
              ? `${formatCompactINR(remaining / daysRemaining)}/day to hit target`
              : '')}
      </div>
    </div>
  );
}
