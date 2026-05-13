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

  return {
    ...raw,
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
