import { create } from 'zustand';
import type { FinanceData } from '@/lib/types';
import { parseExcel } from '@/lib/parser';
import { cleanData } from '@/lib/cleaner';
import { classifyExpenses } from '@/lib/classifier';
import { computeSummary } from '@/lib/analytics/summary';
import { analyzeCategories } from '@/lib/analytics/categories';
import { analyzeMonthly } from '@/lib/analytics/monthly';
import { analyzeAccounts } from '@/lib/analytics/accounts';
import { analyzeBudget } from '@/lib/analytics/budget';
import { analyzeRecurring } from '@/lib/analytics/recurring';
import { generateInsights } from '@/lib/analytics/insights';

interface FinanceStore {
  data: FinanceData | null;
  isLoaded: boolean;
  isProcessing: boolean;
  error: string | null;
  processFile: (file: File) => Promise<void>;
  reset: () => void;
}

export const useFinanceStore = create<FinanceStore>((set) => ({
  data: null,
  isLoaded: false,
  isProcessing: false,
  error: null,

  processFile: async (file: File) => {
    set({ isProcessing: true, error: null });

    try {
      const buffer = await file.arrayBuffer();
      const rawTransactions = parseExcel(buffer);
      const { expenses: rawExpenses, income } = cleanData(rawTransactions);
      const expenses = classifyExpenses(rawExpenses);

      const summary = computeSummary(expenses, income);
      const { categories: categoryAnalysis, subcategories: subcategoryAnalysis } = analyzeCategories(expenses);
      const { trends: monthlyTrends, classification: monthlyClassification } = analyzeMonthly(expenses, income);
      const needsWants = analyzeBudget(expenses);
      const { accounts, creditCard } = analyzeAccounts(expenses, income);
      const recurring = analyzeRecurring(expenses);
      const insights = generateInsights(expenses, income, categoryAnalysis, monthlyTrends, summary.numMonths);

      set({
        data: {
          expenses,
          income,
          summary,
          categoryAnalysis,
          subcategoryAnalysis,
          monthlyTrends,
          needsWants,
          monthlyClassification,
          accounts,
          creditCard,
          recurring,
          insights,
        },
        isLoaded: true,
        isProcessing: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to process file',
        isProcessing: false,
      });
    }
  },

  reset: () => set({ data: null, isLoaded: false, error: null }),
}));
