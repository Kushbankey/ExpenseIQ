import type {
  ExpenseTransaction,
  Transaction,
  MonthlyClassification,
  MonthlyTrend,
  ProjectionStats,
  DiscretionaryPoint,
  SummaryStats,
} from '../types';

function daysInMonth(yyyyMm: string): number {
  const [y, m] = yyyyMm.split('-').map(Number);
  // Day 0 of next month = last day of this month
  return new Date(y, m, 0).getDate();
}

/**
 * Month-end projection for the latest month in the dataset, plus runway.
 * Projection scales month-to-date by (days-in-month / days-elapsed) so partial
 * months don't always look "low" compared to trailing averages.
 */
export function computeProjection(
  expenses: ExpenseTransaction[],
  monthlyTrends: MonthlyTrend[],
  summary: SummaryStats
): ProjectionStats {
  const allMonths = [...new Set(expenses.map((t) => t.month))].sort();
  const currentMonth = allMonths[allMonths.length - 1] ?? '';

  const dim = currentMonth ? daysInMonth(currentMonth) : 30;

  // Days elapsed in current month — use the max day seen in that month's data,
  // but if today is in the current month, prefer today's date (data may lag).
  const currentExp = expenses.filter((t) => t.month === currentMonth);
  const maxDayInData = currentExp.reduce((m, t) => Math.max(m, t.date.getDate()), 0);
  const now = new Date();
  const todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayDay = todayMonth === currentMonth ? now.getDate() : 0;
  const daysElapsed = Math.max(1, Math.min(dim, Math.max(maxDayInData, todayDay)));

  const monthToDate = currentExp.reduce((s, t) => s + t.amount, 0);
  const projectedTotal = (monthToDate * dim) / daysElapsed;

  // Trailing 3 = last 3 *completed* months (exclude the current/latest month)
  const completed = monthlyTrends.filter((t) => t.month !== currentMonth);
  const last3 = completed.slice(-3);
  const trailing3Avg =
    last3.length > 0 ? last3.reduce((s, t) => s + t.expense, 0) / last3.length : 0;

  const projectedVsAvgPct =
    trailing3Avg > 0 ? ((projectedTotal - trailing3Avg) / trailing3Avg) * 100 : 0;

  // Runway = cumulative net savings (totalIncome - totalExpense) / avg monthly pure expense
  const cumulativeNetSavings = summary.netSavings;
  const avgMonthlyPureExpense = summary.avgMonthlyPureExpense;
  const runwayMonths =
    avgMonthlyPureExpense > 0 ? cumulativeNetSavings / avgMonthlyPureExpense : 0;

  return {
    currentMonth,
    daysElapsed,
    daysInMonth: dim,
    monthToDate,
    projectedTotal,
    trailing3Avg,
    projectedVsAvgPct,
    cumulativeNetSavings,
    avgMonthlyPureExpense,
    runwayMonths,
  };
}

/**
 * Discretionary income per month = income − needs − investments.
 * Represents the buffer available for wants and pure savings.
 */
export function computeDiscretionary(
  income: Transaction[],
  monthlyClassification: MonthlyClassification[]
): DiscretionaryPoint[] {
  const incMap = new Map<string, number>();
  for (const t of income) {
    incMap.set(t.month, (incMap.get(t.month) || 0) + t.amount);
  }

  return monthlyClassification.map((m) => {
    const inc = incMap.get(m.month) || 0;
    return {
      month: m.month,
      income: inc,
      needs: m.need,
      investments: m.investment,
      discretionary: inc - m.need - m.investment,
    };
  });
}
