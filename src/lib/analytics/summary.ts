import type { ExpenseTransaction, Transaction, SummaryStats } from '../types';

export function computeSummary(
  expenses: ExpenseTransaction[],
  income: Transaction[]
): SummaryStats {
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const salaryIncome = income
    .filter((t) => t.category === '💰 Salary')
    .reduce((s, t) => s + t.amount, 0);
  const investments = expenses
    .filter((t) => t.classification === 'Investment')
    .reduce((s, t) => s + t.amount, 0);
  const pureExpense = totalExpense - investments;

  const months = [...new Set(expenses.map((t) => t.month))].sort();
  const numMonths = months.length || 1;

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  return {
    totalIncome,
    salaryIncome,
    totalExpense,
    pureExpense,
    investments,
    netSavings,
    savingsRate,
    avgMonthlyIncome: totalIncome / numMonths,
    avgMonthlyExpense: totalExpense / numMonths,
    avgMonthlyPureExpense: pureExpense / numMonths,
    numMonths,
    numTransactions: expenses.length,
    dateRange: months.length > 0 ? `${months[0]} to ${months[months.length - 1]}` : '',
  };
}
