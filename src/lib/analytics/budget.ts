import type { ExpenseTransaction, NeedsWantsResult } from '../types';

export function analyzeBudget(expenses: ExpenseTransaction[]): NeedsWantsResult {
  let needTotal = 0;
  let wantTotal = 0;
  let investmentTotal = 0;

  for (const t of expenses) {
    if (t.classification === 'Need') needTotal += t.amount;
    else if (t.classification === 'Want') wantTotal += t.amount;
    else investmentTotal += t.amount;
  }

  const total = needTotal + wantTotal + investmentTotal;

  return {
    need: { amount: needTotal, pct: total > 0 ? (needTotal / total) * 100 : 0 },
    want: { amount: wantTotal, pct: total > 0 ? (wantTotal / total) * 100 : 0 },
    investment: { amount: investmentTotal, pct: total > 0 ? (investmentTotal / total) * 100 : 0 },
  };
}
