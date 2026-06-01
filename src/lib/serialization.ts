import type { FinanceData } from './types';

export function serializeFinanceData(data: FinanceData): unknown {
  return {
    ...data,
    expenses: data.expenses.map((t) => ({ ...t, date: t.date.toISOString() })),
    income: data.income.map((t) => ({ ...t, date: t.date.toISOString() })),
    insights: {
      ...data.insights,
      largestTransactions: data.insights.largestTransactions.map((t) => ({
        ...t,
        date: t.date.toISOString(),
      })),
    },
    alerts: {
      ...data.alerts,
      outliers: data.alerts.outliers.map((o) => ({ ...o, date: o.date.toISOString() })),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deserializeFinanceData(raw: any): FinanceData {
  // Back-compat shims for data persisted before Phase 1B fields existed
  const alerts = raw.alerts
    ? {
        ...raw.alerts,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        outliers: (raw.alerts.outliers ?? []).map((o: any) => ({
          ...o,
          date: new Date(o.date),
        })),
      }
    : { spikes: [], outliers: [], duplicates: [], drifts: [] };

  const projection = raw.projection ?? {
    currentMonth: '',
    daysElapsed: 0,
    daysInMonth: 0,
    monthToDate: 0,
    projectedTotal: 0,
    trailing3Avg: 0,
    projectedVsAvgPct: 0,
    cumulativeNetSavings: 0,
    avgMonthlyPureExpense: 0,
    runwayMonths: 0,
  };

  const discretionary = raw.discretionary ?? [];

  // Back-compat: shape changes when investments stopped being treated as expenses.
  // Older persisted blobs lack {totalSpending, totalSavings, cashSavings, ...} in
  // summary and use {investment} instead of {savings} on needsWants. Reconstruct
  // those fields from what's still present so the UI doesn't crash on refresh.
  const rawSummary = raw.summary ?? {};
  const totalIncome = rawSummary.totalIncome ?? 0;
  const totalExpense = rawSummary.totalExpense ?? 0;
  const investments = rawSummary.investments ?? 0;
  const totalSpending = rawSummary.totalSpending ?? Math.max(totalExpense - investments, 0);
  const totalSavings = rawSummary.totalSavings ?? (totalIncome - totalSpending);
  const cashSavings = rawSummary.cashSavings ?? (totalSavings - investments);
  const numMonths = rawSummary.numMonths ?? 1;
  const summary = {
    ...rawSummary,
    totalSpending,
    totalSavings,
    cashSavings,
    investmentShareOfIncome:
      rawSummary.investmentShareOfIncome ??
      (totalIncome > 0 ? (investments / totalIncome) * 100 : 0),
    spendingShareOfIncome:
      rawSummary.spendingShareOfIncome ??
      (totalIncome > 0 ? (totalSpending / totalIncome) * 100 : 0),
    avgMonthlySpending: rawSummary.avgMonthlySpending ?? totalSpending / numMonths,
    avgMonthlySavings: rawSummary.avgMonthlySavings ?? totalSavings / numMonths,
    // Older blobs computed netSavings as (income − outflow); the new semantics
    // is (income − spending). Recompute so downstream reads are consistent.
    netSavings: rawSummary.totalSavings ?? totalSavings,
    savingsRate:
      rawSummary.totalSavings != null
        ? rawSummary.savingsRate
        : totalIncome > 0
          ? (totalSavings / totalIncome) * 100
          : 0,
  };

  const rawNW = raw.needsWants ?? {};
  const needsWants = rawNW.savings
    ? rawNW
    : {
        need: rawNW.need ?? { amount: 0, pct: 0 },
        want: rawNW.want ?? { amount: 0, pct: 0 },
        savings: {
          amount: totalSavings,
          pct: totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0,
          breakdown: { investments, cash: cashSavings },
        },
      };

  return {
    ...raw,
    summary,
    needsWants,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expenses: raw.expenses.map((t: any) => ({ ...t, date: new Date(t.date) })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    income: raw.income.map((t: any) => ({ ...t, date: new Date(t.date) })),
    insights: {
      ...raw.insights,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      largestTransactions: raw.insights.largestTransactions.map((t: any) => ({
        ...t,
        date: new Date(t.date),
      })),
    },
    alerts,
    projection,
    discretionary,
  };
}
