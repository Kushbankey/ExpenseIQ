import type { Transaction } from './types';

const FILTER_TYPES = new Set(['Transfer-In', 'Transfer-Out', 'Income Balance']);

export function cleanData(transactions: Transaction[]): {
  expenses: Transaction[];
  income: Transaction[];
} {
  const real = transactions.filter((t) => !FILTER_TYPES.has(t.type));
  const expenses = real.filter((t) => t.type === 'Exp.');
  const income = real.filter((t) => t.type === 'Income');

  return { expenses, income };
}
