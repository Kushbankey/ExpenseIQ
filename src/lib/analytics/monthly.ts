import type { ExpenseTransaction, Transaction, MonthlyTrend, MonthlyClassification } from '../types';

export function analyzeMonthly(
  expenses: ExpenseTransaction[],
  income: Transaction[]
): { trends: MonthlyTrend[]; classification: MonthlyClassification[] } {
  // Aggregate expenses by month
  const expMap = new Map<string, number>();
  for (const t of expenses) {
    expMap.set(t.month, (expMap.get(t.month) || 0) + t.amount);
  }

  // Aggregate income by month
  const incMap = new Map<string, number>();
  for (const t of income) {
    incMap.set(t.month, (incMap.get(t.month) || 0) + t.amount);
  }

  // All months
  const allMonths = [...new Set([...expMap.keys(), ...incMap.keys()])].sort();

  const trends: MonthlyTrend[] = allMonths.map((month) => {
    const expense = expMap.get(month) || 0;
    const inc = incMap.get(month) || 0;
    const net = inc - expense;
    const savingsRate = inc > 0 ? (net / inc) * 100 : 0;
    return { month, income: inc, expense, net, savingsRate, expenseMA3: 0 };
  });

  // 3-month rolling average
  for (let i = 0; i < trends.length; i++) {
    const start = Math.max(0, i - 2);
    const slice = trends.slice(start, i + 1);
    trends[i].expenseMA3 = slice.reduce((s, t) => s + t.expense, 0) / slice.length;
  }

  // Monthly classification breakdown
  const clsMap = new Map<string, { need: number; want: number; investment: number }>();
  for (const t of expenses) {
    const entry = clsMap.get(t.month) || { need: 0, want: 0, investment: 0 };
    if (t.classification === 'Need') entry.need += t.amount;
    else if (t.classification === 'Want') entry.want += t.amount;
    else entry.investment += t.amount;
    clsMap.set(t.month, entry);
  }

  const classification: MonthlyClassification[] = allMonths.map((month) => {
    const entry = clsMap.get(month) || { need: 0, want: 0, investment: 0 };
    return { month, ...entry };
  });

  return { trends, classification };
}
