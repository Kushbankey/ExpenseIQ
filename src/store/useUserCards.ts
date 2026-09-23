import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { UserCard, WalletStatus } from '@/lib/cards/wallet';
import type { SpendBucket, BucketOverride } from '@/lib/cards/buckets';

// =========================================================================
// useUserCards — the wallet, plus confirmed bucket overrides.
//
// Sits alongside useUserSettings rather than inside it: both are persistent
// user-owned data that survives an Excel re-upload, but the card feature is
// self-contained and hydrating it on the budget page would be wasted work.
//
// Hydration is lazy: call `hydrate()` from any page that reads the wallet.
// Repeated calls are no-ops.
//
// The card CATALOGUE is not here. Fees, earn rates and caps live in the repo
// (lib/cards/catalogue.ts) because they are public product facts, identical for
// every user, and benefit from code review when an issuer devalues a card.
// =========================================================================

interface UserCardsStore {
  cards: UserCard[];
  overrides: BucketOverride[];
  isHydrated: boolean;
  isHydrating: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  reset: () => void;

  // Wallet
  addCard: (catalogueId: string, init?: Partial<UserCard>) => Promise<void>;
  updateCard: (catalogueId: string, patch: Partial<UserCard>) => Promise<void>;
  removeCard: (catalogueId: string) => Promise<void>;
  setStatus: (catalogueId: string, status: WalletStatus) => Promise<void>;
  setCreditLimit: (catalogueId: string, creditLimit: number | null) => Promise<void>;
  setParam: (catalogueId: string, key: string, value: boolean) => Promise<void>;

  // Ledger account linking
  linkAccount: (catalogueId: string, accountLabel: string) => Promise<void>;
  unlinkAccount: (catalogueId: string, accountLabel: string) => Promise<void>;
  getCardForAccount: (accountLabel: string) => UserCard | null;

  // Bucket overrides
  saveOverride: (pattern: string, bucket: SpendBucket) => Promise<void>;
  deleteOverride: (pattern: string) => Promise<void>;
}

// ----- row mappers --------------------------------------------------------

interface CardRow {
  id: string;
  catalogue_id: string;
  status: string;
  is_lifetime_free: boolean;
  credit_limit: string | number | null;
  annual_fee_override: string | number | null;
  opened_on: string | null;
  ledger_account_labels: string[] | null;
  params: Record<string, boolean> | null;
}

function num(v: string | number | null): number | undefined {
  if (v === null || v === undefined) return undefined;
  return typeof v === 'string' ? parseFloat(v) : v;
}

function mapCardRow(r: CardRow): UserCard {
  return {
    catalogueId: r.catalogue_id,
    status: (r.status as WalletStatus) ?? 'held',
    isLifetimeFree: r.is_lifetime_free ?? false,
    creditLimit: num(r.credit_limit),
    annualFeeOverride: num(r.annual_fee_override),
    openedOn: r.opened_on ?? undefined,
    ledgerAccountLabels: r.ledger_account_labels ?? [],
    params: r.params ?? {},
  };
}

interface OverrideRow {
  id: string;
  pattern: string;
  bucket: string;
}

function mapOverrideRow(r: OverrideRow): BucketOverride {
  return { pattern: r.pattern, bucket: r.bucket as SpendBucket };
}

/** App camelCase → DB snake_case. Only keys present in the patch are sent. */
function toRow(patch: Partial<UserCard>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.isLifetimeFree !== undefined) row.is_lifetime_free = patch.isLifetimeFree;
  if (patch.creditLimit !== undefined) row.credit_limit = patch.creditLimit;
  if (patch.annualFeeOverride !== undefined) row.annual_fee_override = patch.annualFeeOverride;
  if (patch.openedOn !== undefined) row.opened_on = patch.openedOn;
  if (patch.ledgerAccountLabels !== undefined) row.ledger_account_labels = patch.ledgerAccountLabels;
  if (patch.params !== undefined) row.params = patch.params;
  return row;
}

function normaliseLabel(label: string): string {
  return label.trim();
}

// ----- store --------------------------------------------------------------

export const useUserCards = create<UserCardsStore>((set, get) => ({
  cards: [],
  overrides: [],
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

      const [cardsRes, overridesRes] = await Promise.all([
        supabase
          .from('user_cards')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('card_bucket_overrides')
          .select('*')
          .eq('user_id', user.id),
      ]);

      if (cardsRes.error) throw cardsRes.error;
      if (overridesRes.error) throw overridesRes.error;

      set({
        cards: (cardsRes.data ?? []).map(mapCardRow),
        overrides: (overridesRes.data ?? []).map(mapOverrideRow),
        isHydrating: false,
        isHydrated: true,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load cards',
        isHydrating: false,
      });
    }
  },

  reset: () =>
    set({ cards: [], overrides: [], isHydrated: false, isHydrating: false, error: null }),

  // ---- wallet ----------------------------------------------------------

  addCard: async (catalogueId, init = {}) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (get().cards.some((c) => c.catalogueId === catalogueId)) return;

    const { data, error } = await supabase
      .from('user_cards')
      .insert({
        user_id: user.id,
        catalogue_id: catalogueId,
        status: init.status ?? 'held',
        is_lifetime_free: init.isLifetimeFree ?? false,
        credit_limit: init.creditLimit ?? null,
        annual_fee_override: init.annualFeeOverride ?? null,
        opened_on: init.openedOn ?? null,
        ledger_account_labels: init.ledgerAccountLabels ?? [],
        params: init.params ?? {},
      })
      .select()
      .single();
    if (error) throw error;
    if (data) set({ cards: [...get().cards, mapCardRow(data)] });
  },

  updateCard: async (catalogueId, patch) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const row = toRow(patch);
    if (Object.keys(row).length === 0) return;
    row.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('user_cards')
      .update(row)
      .eq('user_id', user.id)
      .eq('catalogue_id', catalogueId)
      .select()
      .single();
    if (error) throw error;
    if (data) {
      const next = mapCardRow(data);
      set({ cards: get().cards.map((c) => (c.catalogueId === catalogueId ? next : c)) });
    }
  },

  removeCard: async (catalogueId) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_cards')
      .delete()
      .eq('user_id', user.id)
      .eq('catalogue_id', catalogueId);
    if (error) throw error;

    set({ cards: get().cards.filter((c) => c.catalogueId !== catalogueId) });
  },

  setStatus: async (catalogueId, status) => {
    await get().updateCard(catalogueId, { status });
  },

  setCreditLimit: async (catalogueId, creditLimit) => {
    // null clears it. The engine treats a missing limit as an unpriceable cap
    // rather than guessing, so clearing is a meaningful action, not a no-op.
    await get().updateCard(catalogueId, {
      creditLimit: creditLimit === null ? undefined : creditLimit,
    });
  },

  setParam: async (catalogueId, key, value) => {
    const card = get().cards.find((c) => c.catalogueId === catalogueId);
    if (!card) return;
    await get().updateCard(catalogueId, { params: { ...card.params, [key]: value } });
  },

  // ---- ledger account linking ------------------------------------------

  linkAccount: async (catalogueId, accountLabel) => {
    const label = normaliseLabel(accountLabel);
    if (!label) return;

    const cards = get().cards;
    const target = cards.find((c) => c.catalogueId === catalogueId);
    if (!target) return;

    // One account maps to at most one card. Re-linking moves it rather than
    // duplicating, otherwise the same spend is counted against two cards.
    const previous = cards.find(
      (c) =>
        c.catalogueId !== catalogueId &&
        c.ledgerAccountLabels.some((l) => l.toLowerCase() === label.toLowerCase())
    );
    if (previous) {
      await get().unlinkAccount(previous.catalogueId, label);
    }

    if (target.ledgerAccountLabels.some((l) => l.toLowerCase() === label.toLowerCase())) return;

    await get().updateCard(catalogueId, {
      ledgerAccountLabels: [...target.ledgerAccountLabels, label],
    });
  },

  unlinkAccount: async (catalogueId, accountLabel) => {
    const label = normaliseLabel(accountLabel).toLowerCase();
    const card = get().cards.find((c) => c.catalogueId === catalogueId);
    if (!card) return;

    await get().updateCard(catalogueId, {
      ledgerAccountLabels: card.ledgerAccountLabels.filter((l) => l.toLowerCase() !== label),
    });
  },

  getCardForAccount: (accountLabel) => {
    const label = normaliseLabel(accountLabel).toLowerCase();
    return (
      get().cards.find((c) =>
        c.ledgerAccountLabels.some((l) => l.toLowerCase() === label)
      ) ?? null
    );
  },

  // ---- bucket overrides ------------------------------------------------

  saveOverride: async (pattern, bucket) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const normalised = pattern.trim().toLowerCase();
    if (!normalised) return;

    const { data, error } = await supabase
      .from('card_bucket_overrides')
      .upsert(
        { user_id: user.id, pattern: normalised, bucket },
        { onConflict: 'user_id,pattern' },
      )
      .select()
      .single();
    if (error) throw error;
    if (data) {
      const next = mapOverrideRow(data);
      const i = get().overrides.findIndex((o) => o.pattern === normalised);
      set({
        overrides: i >= 0
          ? get().overrides.map((o, idx) => (idx === i ? next : o))
          : [...get().overrides, next],
      });
    }
  },

  deleteOverride: async (pattern) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const normalised = pattern.trim().toLowerCase();
    const { error } = await supabase
      .from('card_bucket_overrides')
      .delete()
      .eq('user_id', user.id)
      .eq('pattern', normalised);
    if (error) throw error;

    set({ overrides: get().overrides.filter((o) => o.pattern !== normalised) });
  },
}));
