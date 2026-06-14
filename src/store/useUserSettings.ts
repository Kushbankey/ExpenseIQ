import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { CategoryBudget, ClassificationRule, BudgetKind } from '@/lib/types';

// =========================================================================
// useUserSettings — persistent user-owned data.
//
// Lives independently of useFinanceStore. processFile() in the finance store
// only touches Excel-derived analytics; settings remain intact across
// re-uploads.
//
// Hydration is lazy: call `hydrate()` from any page that reads settings (e.g.
// the budget page). Repeated calls are no-ops.
// =========================================================================

interface UserSettingsStore {
  budgets: CategoryBudget[];                // all rows (active + historical)
  rules: ClassificationRule[];
  isHydrated: boolean;
  isHydrating: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  reset: () => void;

  // Budgets
  upsertBudget: (category: string, monthlyLimit: number, kind: BudgetKind) => Promise<void>;
  setBudgetKind: (category: string, kind: BudgetKind) => Promise<void>;
  deleteBudget: (category: string) => Promise<void>;
  getActiveBudget: (category: string, asOf?: Date) => CategoryBudget | null;
  getBudgetForMonth: (category: string, month: string) => CategoryBudget | null;

  // Rules (feature #7 — exposed early so it doesn't need a second migration)
  saveRule: (pattern: string, category: string, subcategory: string | null) => Promise<void>;
}

// ----- helpers ------------------------------------------------------------

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function firstOfMonth(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function lastDayOfPrevMonth(d: Date): string {
  // Day 0 of (year, month) = last day of (year, month - 1).
  const prev = new Date(d.getFullYear(), d.getMonth(), 0);
  return isoDate(prev);
}

function monthKey(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 7);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

// DB snake_case → app camelCase.
interface BudgetRow {
  id: string;
  category: string;
  monthly_limit: string | number;
  kind: string | null;
  cadence: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

function mapBudgetRow(r: BudgetRow): CategoryBudget {
  return {
    id: r.id,
    category: r.category,
    monthlyLimit: typeof r.monthly_limit === 'string' ? parseFloat(r.monthly_limit) : r.monthly_limit,
    kind: (r.kind === 'target' ? 'target' : 'ceiling'),
    cadence: (r.cadence as CategoryBudget['cadence']) ?? 'monthly',
    effectiveFrom: r.effective_from,
    effectiveTo: r.effective_to,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface RuleRow {
  id: string;
  pattern: string;
  category: string;
  subcategory: string | null;
  confidence: string | number;
  applied_count: number;
  created_at: string;
}

function mapRuleRow(r: RuleRow): ClassificationRule {
  return {
    id: r.id,
    pattern: r.pattern,
    category: r.category,
    subcategory: r.subcategory,
    confidence: typeof r.confidence === 'string' ? parseFloat(r.confidence) : r.confidence,
    appliedCount: r.applied_count,
    createdAt: r.created_at,
  };
}

// Find the row whose [effective_from, effective_to] bracket the given date.
function findActiveAt(rows: CategoryBudget[], category: string, asOf: Date): CategoryBudget | null {
  const asOfIso = isoDate(asOf);
  for (const b of rows) {
    if (b.category !== category) continue;
    if (b.effectiveFrom > asOfIso) continue;
    if (b.effectiveTo !== null && b.effectiveTo < asOfIso) continue;
    return b;
  }
  return null;
}

// ----- store --------------------------------------------------------------

export const useUserSettings = create<UserSettingsStore>((set, get) => ({
  budgets: [],
  rules: [],
  isHydrated: false,
  isHydrating: false,
  error: null,

  hydrate: async () => {
    if (get().isHydrated || get().isHydrating) return;
    set({ isHydrating: true, error: null });

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isHydrating: false, isHydrated: true });
        return;
      }

      const [budgetsRes, rulesRes] = await Promise.all([
        supabase
          .from('category_budgets')
          .select('*')
          .eq('user_id', user.id)
          .order('effective_from', { ascending: false }),
        supabase
          .from('classification_rules')
          .select('*')
          .eq('user_id', user.id),
      ]);

      if (budgetsRes.error) throw budgetsRes.error;
      if (rulesRes.error) throw rulesRes.error;

      set({
        budgets: (budgetsRes.data ?? []).map(mapBudgetRow),
        rules: (rulesRes.data ?? []).map(mapRuleRow),
        isHydrating: false,
        isHydrated: true,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load settings',
        isHydrating: false,
      });
    }
  },

  reset: () => set({ budgets: [], rules: [], isHydrated: false, isHydrating: false, error: null }),

  // ---- budgets ---------------------------------------------------------
  upsertBudget: async (category, monthlyLimit, kind) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const startOfThisMonth = firstOfMonth(today);
    const existing = findActiveAt(get().budgets, category, today);

    // Case A: no active row → insert from start of this month.
    if (!existing) {
      const { data, error } = await supabase
        .from('category_budgets')
        .insert({
          user_id: user.id,
          category,
          monthly_limit: monthlyLimit,
          kind,
          effective_from: startOfThisMonth,
          effective_to: null,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) set({ budgets: [mapBudgetRow(data), ...get().budgets] });
      return;
    }

    // Case B: same value AND same kind, no-op.
    if (existing.monthlyLimit === monthlyLimit && existing.kind === kind) return;

    // Case C: active row already starts this month → in-place UPDATE.
    if (existing.effectiveFrom === startOfThisMonth) {
      const { data, error } = await supabase
        .from('category_budgets')
        .update({ monthly_limit: monthlyLimit, kind, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      if (data) {
        const updated = mapBudgetRow(data);
        set({ budgets: get().budgets.map((b) => (b.id === updated.id ? updated : b)) });
      }
      return;
    }

    // Case D: active row started in a prior month → close it, insert new from start of this month.
    const closeAt = lastDayOfPrevMonth(today);
    const { error: closeErr } = await supabase
      .from('category_budgets')
      .update({ effective_to: closeAt, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (closeErr) throw closeErr;

    const { data: inserted, error: insErr } = await supabase
      .from('category_budgets')
      .insert({
        user_id: user.id,
        category,
        monthly_limit: monthlyLimit,
        kind,
        effective_from: startOfThisMonth,
        effective_to: null,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    set({
      budgets: [
        ...(inserted ? [mapBudgetRow(inserted)] : []),
        ...get().budgets.map((b) => (b.id === existing.id ? { ...b, effectiveTo: closeAt } : b)),
      ],
    });
  },

  // Flip an existing budget between ceiling and target without touching the
  // limit. If no active row exists for the category, this is a no-op — the
  // user has to set a limit first.
  setBudgetKind: async (category, kind) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = findActiveAt(get().budgets, category, new Date());
    if (!existing || existing.kind === kind) return;

    const { data, error } = await supabase
      .from('category_budgets')
      .update({ kind, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    if (data) {
      const updated = mapBudgetRow(data);
      set({ budgets: get().budgets.map((b) => (b.id === updated.id ? updated : b)) });
    }
  },

  deleteBudget: async (category) => {
    // Soft delete: close the active row at today's date. History stays.
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const existing = findActiveAt(get().budgets, category, today);
    if (!existing) return;

    const closeAt = isoDate(today);
    const { error } = await supabase
      .from('category_budgets')
      .update({ effective_to: closeAt, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;

    set({
      budgets: get().budgets.map((b) => (b.id === existing.id ? { ...b, effectiveTo: closeAt } : b)),
    });
  },

  getActiveBudget: (category, asOf = new Date()) => findActiveAt(get().budgets, category, asOf),

  getBudgetForMonth: (category, month) => {
    // Pick the row whose effective period covers the LAST day of that month.
    // (If a budget changes mid-month, downstream analytics uses the row at month-end.)
    const [yStr, mStr] = month.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const lastDay = new Date(y, m, 0); // day 0 of next month = last of this month
    return findActiveAt(get().budgets, category, lastDay);
  },

  // ---- rules (used later in feature #7) --------------------------------
  saveRule: async (pattern, category, subcategory) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('classification_rules')
      .upsert(
        {
          user_id: user.id,
          pattern,
          category,
          subcategory,
          confidence: 1.0,
        },
        { onConflict: 'user_id,pattern' },
      )
      .select()
      .single();
    if (error) throw error;
    if (data) {
      const next = mapRuleRow(data);
      const existing = get().rules.findIndex((r) => r.pattern === pattern);
      set({
        rules: existing >= 0
          ? get().rules.map((r, i) => (i === existing ? next : r))
          : [...get().rules, next],
      });
    }
  },
}));

// Exported helpers — useful for analytics / tests outside the React tree.
export const __budgetHelpers = { firstOfMonth, lastDayOfPrevMonth, monthKey, findActiveAt };
