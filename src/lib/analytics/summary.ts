import type { ExpenseTransaction, Transaction, SummaryStats } from '../types';

export function computeSummary(
  expenses: ExpenseTransaction[],
  income: Transaction[]
): SummaryStats {
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const salaryIncome = income
    .filter((t) => t.category === '💰 Salary')
    .reduce((s, t) => s + t.amount, 0);

  const investments = expenses
    .filter((t) => t.classification === 'Investment')
    .reduce((s, t) => s + t.amount, 0);
  const totalSpending = expenses
    .filter((t) => t.classification !== 'Investment')
    .reduce((s, t) => s + t.amount, 0);

  // Outflow = what left the bank account this period. Kept as totalExpense
  // for back-compat with older readers, but it is NOT the "consumption" number.
  const totalExpense = totalSpending + investments;
  const pureExpense = totalSpending;

  // Investments ARE savings (deferred consumption). Cash residual is what's
  // left after both spending and investing.
  const totalSavings = totalIncome - totalSpending;
  const cashSavings = totalSavings - investments;
  const netSavings = totalSavings;
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  const months = [...new Set(expenses.map((t) => t.month))].sort();
  const numMonths = months.length || 1;

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

    totalSpending,
    totalSavings,
    cashSavings,
    investmentShareOfIncome: totalIncome > 0 ? (investments / totalIncome) * 100 : 0,
    spendingShareOfIncome: totalIncome > 0 ? (totalSpending / totalIncome) * 100 : 0,
    avgMonthlySpending: totalSpending / numMonths,
    avgMonthlySavings: totalSavings / numMonths,
  };
}
