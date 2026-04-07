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
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deserializeFinanceData(raw: any): FinanceData {
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
  };
}
