import type { ExpenseTransaction, Transaction, NeedsWantsResult } from '../types';

/**
 * Compute Needs / Wants / Savings as a share of **income** (not outflow).
 * Savings = Investments + Cash residual (income − spending − investments).
 * This is what the 50/30/20 rule actually targets.
 */
export function analyzeBudget(
  expenses: ExpenseTransaction[],
  income: Transaction[]
): NeedsWantsResult {
  let needTotal = 0;
  let wantTotal = 0;
  let investmentTotal = 0;

  for (const t of expenses) {
    if (t.classification === 'Need') needTotal += t.amount;
    else if (t.classification === 'Want') wantTotal += t.amount;
    else investmentTotal += t.amount;
  }

  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const totalSpending = needTotal + wantTotal;
  const totalSavings = totalIncome - totalSpending;
  const cashSavings = totalSavings - investmentTotal;

  const pct = (v: number) => (totalIncome > 0 ? (v / totalIncome) * 100 : 0);

  return {
    need: { amount: needTotal, pct: pct(needTotal) },
    want: { amount: wantTotal, pct: pct(wantTotal) },
    savings: {
      amount: totalSavings,
      pct: pct(totalSavings),
      breakdown: { investments: investmentTotal, cash: cashSavings },
    },
  };
}
