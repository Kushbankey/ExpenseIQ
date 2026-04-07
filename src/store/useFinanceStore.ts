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
import { createClient } from '@/lib/supabase/client';
import { serializeFinanceData, deserializeFinanceData } from '@/lib/serialization';

interface FinanceStore {
  data: FinanceData | null;
  isLoaded: boolean;
  isProcessing: boolean;
  isRestoring: boolean;
  error: string | null;
  fileName: string | null;
  processFile: (file: File) => Promise<void>;
  saveToSupabase: (file?: File) => Promise<void>;
  restoreFromSupabase: () => Promise<boolean>;
  reset: () => void;
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  data: null,
  isLoaded: false,
  isProcessing: false,
  isRestoring: false,
  error: null,
  fileName: null,

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
        fileName: file.name,
      });

      // Save to Supabase in background
      get().saveToSupabase(file);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to process file',
        isProcessing: false,
      });
    }
  },

  saveToSupabase: async (file?: File) => {
    const { data, fileName } = get();
    if (!data) return;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save processed data as JSONB
      const serialized = serializeFinanceData(data);
      await supabase
        .from('user_data')
        .upsert({
          user_id: user.id,
          finance_data: serialized,
          file_name: fileName ?? 'unknown.xlsx',
          uploaded_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      // Upload Excel file to Storage
      if (file) {
        await supabase.storage
          .from('excel-files')
          .upload(`${user.id}/${file.name}`, file, { upsert: true });
      }
    } catch (err) {
      console.error('Failed to save to Supabase:', err);
    }
  },

  restoreFromSupabase: async () => {
    set({ isRestoring: true });

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isRestoring: false });
        return false;
      }

      const { data: row } = await supabase
        .from('user_data')
        .select('finance_data, file_name')
        .eq('user_id', user.id)
        .single();

      if (row) {
        const financeData = deserializeFinanceData(row.finance_data);
        set({
          data: financeData,
          isLoaded: true,
          isRestoring: false,
          fileName: row.file_name,
        });
        return true;
      }

      set({ isRestoring: false });
      return false;
    } catch {
      set({ isRestoring: false });
      return false;
    }
  },

  reset: () => set({ data: null, isLoaded: false, isRestoring: false, error: null, fileName: null }),
}));
