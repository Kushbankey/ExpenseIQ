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
import { analyzeTemporal } from '@/lib/analytics/temporal';
import { analyzeMerchants } from '@/lib/analytics/merchants';
import { analyzePortfolio } from '@/lib/analytics/portfolio';
import { buildSankeyData } from '@/lib/analytics/flow';
import { computeProjection, computeDiscretionary } from '@/lib/analytics/projection';
import { detectAnomalies } from '@/lib/analytics/anomalies';
import { createClient } from '@/lib/supabase/client';
import { serializeFinanceData, deserializeFinanceData } from '@/lib/serialization';

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

interface FinanceStore {
  data: FinanceData | null;
  isLoaded: boolean;
  isProcessing: boolean;
  isRestoring: boolean;
  error: string | null;
  fileName: string | null;
  // Persistence is fire-and-forget so the UI stays responsive after a parse.
  // These surface the outcome: without them a failed save looks exactly like a
  // successful one and the upload is silently lost on next login.
  saveState: SaveState;
  saveError: string | null;
  savedAt: string | null;
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
  saveState: 'idle',
  saveError: null,
  savedAt: null,

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
      const needsWants = analyzeBudget(expenses, income);
      const { accounts, creditCard } = analyzeAccounts(expenses, income);
      const recurring = analyzeRecurring(expenses);
      const insights = generateInsights(expenses, income, categoryAnalysis, monthlyTrends, summary.numMonths);
      const temporal = analyzeTemporal(expenses);
      const merchants = analyzeMerchants(expenses);
      const portfolio = analyzePortfolio(expenses);
      const sankey = buildSankeyData(expenses, income, portfolio);
      const projection = computeProjection(expenses, monthlyTrends, summary);
      const discretionary = computeDiscretionary(income, monthlyClassification);
      const alerts = detectAnomalies(expenses, recurring);

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
          temporal,
          merchants,
          portfolio,
          sankey,
          projection,
          discretionary,
          alerts,
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

    set({ saveState: 'saving', saveError: null });

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ saveState: 'failed', saveError: 'Not signed in, so nothing was saved.' });
        return;
      }

      // Save processed data as JSONB. The row is the source of truth on next
      // login, so a failure here must not pass silently.
      const serialized = serializeFinanceData(data);
      const { error: rowErr } = await supabase
        .from('user_data')
        .upsert({
          user_id: user.id,
          finance_data: serialized,
          file_name: fileName ?? 'unknown.xlsx',
          uploaded_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (rowErr) throw rowErr;

      // Upload Excel file to Storage. Secondary: the parsed row above is what
      // the app reads back, so a storage failure is reported but not fatal.
      if (file) {
        const { error: fileErr } = await supabase.storage
          .from('excel-files')
          .upload(`${user.id}/${file.name}`, file, { upsert: true });
        if (fileErr) {
          set({
            saveState: 'saved',
            savedAt: new Date().toISOString(),
            saveError: `Data saved, but the original file could not be archived: ${fileErr.message}`,
          });
          return;
        }
      }

      set({ saveState: 'saved', savedAt: new Date().toISOString(), saveError: null });
    } catch (err) {
      set({
        saveState: 'failed',
        saveError: err instanceof Error ? err.message : 'Could not save to the server.',
      });
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

  reset: () => set({ data: null, isLoaded: false, isRestoring: false, error: null, fileName: null,
    saveState: 'idle', saveError: null, savedAt: null }),
}));
