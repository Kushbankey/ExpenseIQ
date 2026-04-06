import type { ExpenseTransaction, CategoryTotal, SubcategoryTotal } from '../types';

export function analyzeCategories(expenses: ExpenseTransaction[]): {
  categories: CategoryTotal[];
  subcategories: SubcategoryTotal[];
} {
  const months = new Set(expenses.map((t) => t.month)).size || 1;

  // Group by category
  const catMap = new Map<string, { total: number; count: number }>();
  for (const t of expenses) {
    const entry = catMap.get(t.category) || { total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    catMap.set(t.category, entry);
  }

  const categories: CategoryTotal[] = [...catMap.entries()]
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      avgTxn: total / count,
      monthlyAvg: total / months,
    }))
    .sort((a, b) => b.total - a.total);

  // Group by category + subcategory
  const subMap = new Map<string, { total: number; count: number }>();
  for (const t of expenses) {
    const key = `${t.category}|||${t.subcategory}`;
    const entry = subMap.get(key) || { total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    subMap.set(key, entry);
  }

  const subcategories: SubcategoryTotal[] = [...subMap.entries()]
    .map(([key, { total, count }]) => {
      const [category, subcategory] = key.split('|||');
      return { category, subcategory, total, count };
    })
    .sort((a, b) => b.total - a.total);

  return { categories, subcategories };
}
