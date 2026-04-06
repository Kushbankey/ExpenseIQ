import type { Transaction, ExpenseTransaction, Classification } from './types';
import { NEEDS_CATEGORIES, WANTS_CATEGORIES, INVESTMENT_CATEGORIES, FOOD_WANTS_SUBCATS } from './constants';

export function classifyExpenses(expenses: Transaction[]): ExpenseTransaction[] {
  return expenses.map((txn) => ({
    ...txn,
    classification: classify(txn.category, txn.subcategory),
  }));
}

function classify(category: string, subcategory: string): Classification {
  if (INVESTMENT_CATEGORIES.has(category)) return 'Investment';
  if (NEEDS_CATEGORIES.has(category)) {
    if (category === '🍜 Food' && FOOD_WANTS_SUBCATS.has(subcategory)) return 'Want';
    return 'Need';
  }
  if (WANTS_CATEGORIES.has(category)) return 'Want';
  return 'Want';
}
