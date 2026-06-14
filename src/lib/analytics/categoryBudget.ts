import type {
  ExpenseTransaction,
  CategoryBudget,
  CategoryTotal,
  CategoryBudgetStatus,
  BudgetStatus,
  BudgetKind,
} from '../types';

// =========================================================================
// Category-level budget status.
//
// Pure function. Takes the Excel-derived expenses + categoryAnalysis and the
// Supabase-persisted budgets, returns one CategoryBudgetStatus per category
// that either has a budget OR has spending this period.
//
// "As-of" date logic mirrors lib/analytics/projection.ts so the budget page
// stays internally consistent with the projection card on the overview.
// =========================================================================

// Real-money expense categories we want to surface in the budget UI.
// Filter excludes:
//   - Account-name categories that show up in transfers (SBI, HDFC, IDFC, …)
//   - Income-side flow categories (Cashback, Refunds, Split, Modified Bal., …)
//   - Generic "Other" buckets the user hasn't labelled
// Detection is heuristic — anything starting with an emoji is treated as a
// real spend category. The exclude list catches the rest.
const NON_SPEND_CATEGORIES = new Set([
  'SBI', 'HDFC', 'IDFC', 'Ujjivan', 'DCB', 'Cash', 'Amazon Pay', 'Coinswitch',
  'Zerodha', 'IND Money', 'HDFC Diners Club Privilege', 'Bank',
  'Cashback', 'Refunds', 'Split', 'Modified Bal.', 'Income Balance',
  'Policy', 'Other',
]);

export function isRealSpendCategory(category: string): boolean {
  if (!category) return false;
  if (NON_SPEND_CATEGORIES.has(category)) return false;
  // Categories the user has tagged with an emoji are always real spend buckets.
  // Falls back to: any non-listed string is treated as real (defensive — a new
  // category the user adds will show up automatically).
  return true;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function daysInYearMonth(yyyyMm: string): number {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m, 0).getDate(); // day 0 of next = last of this
}

function prevMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 2, 1); // m is 1-indexed; -2 = "previous month, day 1"
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function endOfMonthDate(yyyyMm: string): Date {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m, 0); // last day of that month
}

// Find the budget row whose [effective_from, effective_to] bracket `asOf`.
function activeBudgetAt(
  budgets: CategoryBudget[],
  category: string,
  asOf: Date,
): CategoryBudget | null {
  const asOfIso = `${asOf.getFullYear()}-${pad(asOf.getMonth() + 1)}-${pad(asOf.getDate())}`;
  for (const b of budgets) {
    if (b.category !== category) continue;
    if (b.effectiveFrom > asOfIso) continue;
    if (b.effectiveTo !== null && b.effectiveTo < asOfIso) continue;
    return b;
  }
  return null;
}

function computeCeilingStatus(
  spent: number,
  limit: number | null,
  projectedEndOfMonth: number,
): BudgetStatus {
  if (limit === null || limit <= 0) return 'no-budget';
  if (spent > limit) return 'over';
  if (spent >= 0.8 * limit) return 'watch';
  if (projectedEndOfMonth > limit) return 'watch';
  return 'on-pace';
}

// Target mode is for things you want to *hit at least*, like SIPs. Catching
// up depends on whether the days remaining make it realistic — for lumpy
// commitments (SIPs auto-debit on day N) the "missed" verdict should only
// fire near month-end.
function computeTargetStatus(
  spent: number,
  limit: number | null,
  daysElapsed: number,
  daysInMonth: number,
): BudgetStatus {
  if (limit === null || limit <= 0) return 'no-budget';
  if (spent >= limit) return 'achieved';
  const daysRemaining = daysInMonth - daysElapsed;
  // If at least 80% of the target is met OR we're earlier than the 25th, treat as on-track.
  if (spent >= 0.8 * limit || daysRemaining > 5) {
    return daysRemaining > 5 ? 'on-track' : 'behind';
  }
  // Less than ~5 days left and still under target → missed.
  if (daysRemaining <= 2) return 'missed';
  return 'behind';
}

function computeStatus(
  kind: BudgetKind,
  spent: number,
  limit: number | null,
  projectedEndOfMonth: number,
  daysElapsed: number,
  daysInMonth: number,
): BudgetStatus {
  return kind === 'target'
    ? computeTargetStatus(spent, limit, daysElapsed, daysInMonth)
    : computeCeilingStatus(spent, limit, projectedEndOfMonth);
}

// Ordering: red issues first, then amber, then green, then no-budget.
const STATUS_ORDER: Record<BudgetStatus, number> = {
  over: 0,
  missed: 0,
  watch: 1,
  behind: 1,
  'on-pace': 2,
  'on-track': 2,
  achieved: 2,
  'no-budget': 3,
};

export function computeCategoryBudgetStatuses(
  expenses: ExpenseTransaction[],
  budgets: CategoryBudget[],
  categoryAnalysis: CategoryTotal[],
): CategoryBudgetStatus[] {
  // ----- determine current month + as-of date (same logic as projection.ts) ----
  const allMonths = [...new Set(expenses.map((t) => t.month))].sort();
  const currentMonth = allMonths[allMonths.length - 1] ?? '';
  if (!currentMonth) return [];

  const daysInMonth = daysInYearMonth(currentMonth);
  const currentExp = expenses.filter((t) => t.month === currentMonth);
  const maxDayInData = currentExp.reduce((m, t) => Math.max(m, t.date.getDate()), 0);
  const now = new Date();
  const todayMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const todayDay = todayMonth === currentMonth ? now.getDate() : 0;
  const daysElapsed = Math.max(1, Math.min(daysInMonth, Math.max(maxDayInData, todayDay)));
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  // As-of Date for budget lookup = the day represented by daysElapsed in currentMonth.
  const [cy, cm] = currentMonth.split('-').map(Number);
  const asOfDate = new Date(cy, cm - 1, daysElapsed);

  // ----- this month's spend per category ---------------------------------
  const spendThisMonth = new Map<string, number>();
  for (const t of currentExp) {
    spendThisMonth.set(t.category, (spendThisMonth.get(t.category) || 0) + t.amount);
  }

  // ----- last month's spend per category ---------------------------------
  const lastMonth = prevMonth(currentMonth);
  const lastMonthExp = expenses.filter((t) => t.month === lastMonth);
  const spendLastMonth = new Map<string, number>();
  for (const t of lastMonthExp) {
    spendLastMonth.set(t.category, (spendLastMonth.get(t.category) || 0) + t.amount);
  }
  const lastMonthEnd = endOfMonthDate(lastMonth);

  // ----- historical anchors per category ---------------------------------
  // Trailing 3-month avg: average over the 3 completed months prior to current.
  // Months with zero spend in that category still count toward the denominator,
  // so volatile categories don't look inflated.
  const completedMonths = [...new Set(expenses.map((t) => t.month))]
    .filter((m) => m !== currentMonth)
    .sort();
  const trailing3Months = completedMonths.slice(-3);
  const trailingSet = new Set(trailing3Months);

  const trailingSum = new Map<string, number>();
  const lifetimeSum = new Map<string, number>();
  for (const t of expenses) {
    if (t.month === currentMonth) continue;
    lifetimeSum.set(t.category, (lifetimeSum.get(t.category) || 0) + t.amount);
    if (trailingSet.has(t.month)) {
      trailingSum.set(t.category, (trailingSum.get(t.category) || 0) + t.amount);
    }
  }
  const numTrailing = trailing3Months.length;
  const numLifetime = completedMonths.length;

  // ----- per-category classification map ---------------------------------
  // We use this to default Investment-classified categories to 'target' kind
  // when the user hasn't explicitly persisted a kind yet.
  const classificationByCategory = new Map<string, ExpenseTransaction['classification']>();
  for (const t of expenses) {
    if (!classificationByCategory.has(t.category)) {
      classificationByCategory.set(t.category, t.classification);
    }
  }

  // ----- candidate categories: (real-spend ∩ has-active-budget-or-spend) -
  const candidates = new Set<string>();
  for (const c of categoryAnalysis) {
    if (isRealSpendCategory(c.category)) candidates.add(c.category);
  }
  for (const b of budgets) {
    if (b.effectiveTo === null && isRealSpendCategory(b.category)) candidates.add(b.category);
  }

  // ----- build status rows -----------------------------------------------
  const rows: CategoryBudgetStatus[] = [];
  for (const category of candidates) {
    const spent = spendThisMonth.get(category) ?? 0;
    const activeBudget = activeBudgetAt(budgets, category, asOfDate);
    const limit = activeBudget?.monthlyLimit ?? null;

    // Resolve effective kind. Persisted row wins; otherwise default to
    // 'target' for Investment-classified categories, 'ceiling' for the rest.
    const isInvestment = classificationByCategory.get(category) === 'Investment';
    const kind: BudgetKind = activeBudget?.kind ?? (isInvestment ? 'target' : 'ceiling');

    const projectedEndOfMonth = (spent * daysInMonth) / daysElapsed;
    const status = computeStatus(kind, spent, limit, projectedEndOfMonth, daysElapsed, daysInMonth);

    const remaining = limit !== null ? limit - spent : 0;
    const pctUsed = limit !== null && limit > 0 ? (spent / limit) * 100 : 0;
    const paceAllowedToday = limit !== null ? (limit * daysElapsed) / daysInMonth : 0;
    const dailyPaceRemaining = limit !== null && daysRemaining > 0
      ? Math.max(0, (limit - spent) / daysRemaining)
      : 0;

    const lastMonthBudget = activeBudgetAt(budgets, category, lastMonthEnd);
    const trailing3Avg = numTrailing > 0
      ? (trailingSum.get(category) ?? 0) / numTrailing
      : 0;
    const lifetimeMonthlyAvg = numLifetime > 0
      ? (lifetimeSum.get(category) ?? 0) / numLifetime
      : 0;

    rows.push({
      category,
      kind,
      monthlyLimit: limit,
      spent,
      remaining,
      pctUsed,
      daysElapsed,
      daysInMonth,
      projectedEndOfMonth,
      paceAllowedToday,
      dailyPaceRemaining,
      status,
      lastMonthSpent: spendLastMonth.get(category) ?? 0,
      lastMonthLimit: lastMonthBudget?.monthlyLimit ?? null,
      trailing3Avg,
      trailing3MonthCount: numTrailing,
      lifetimeMonthlyAvg,
    });
  }

  // ----- sort: over → watch → on-pace → no-budget; spend desc within each
  rows.sort((a, b) => {
    const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (so !== 0) return so;
    return b.spent - a.spent;
  });

  return rows;
}
