-- Card routing playbook: wallet + bucket overrides.
-- Both tables are owner-scoped via RLS = (user_id = auth.uid()).
--
-- To apply: paste into Supabase SQL editor and run, or `supabase db push` if CLI is wired.
-- Safe to re-run: every CREATE uses IF NOT EXISTS, every policy is dropped before recreate.

-- =========================================================================
-- 1. user_cards — which cards this user holds, applied for, or is weighing.
-- =========================================================================
-- The card CATALOGUE (fees, earn rates, caps) lives in the repo as typed
-- constants, not here: it is public product data, identical for every user, and
-- benefits from code review when terms change. This table holds only the part
-- that is personal.
--
-- Three columns exist because the catalogue cannot know them:
--
--   is_lifetime_free    the catalogue lists a fee; a given holder may pay none.
--                       Without this the engine recommends dropping a card that
--                       is actually free.
--   credit_limit        some caps are a percentage of it (Kiwi caps monthly
--                       cashback at 1% of limit). The same card is worth roughly
--                       Rs 1,600 or Rs 5,800 a year depending on this one number,
--                       and it cannot be inferred from the ledger.
--   params              per-card switches the terms depend on, e.g.
--                       {"neonSubscribed": true} or {"amazonPrime": true}.
--
-- ledger_account_labels maps the free-text `account` values in the uploaded
-- spreadsheet onto this card. It is an array because the same card can appear
-- under more than one spelling across re-uploads. Populated only by explicit
-- user confirmation: "HDFC" is a savings account while "HDFC Diners Club
-- Privilege" is a card, and guessing wrong silently corrupts every number
-- downstream.

create table if not exists public.user_cards (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  catalogue_id           text not null,
  status                 text not null default 'held'
                           check (status in ('held', 'applied', 'considering', 'closed')),
  is_lifetime_free       boolean not null default false,
  credit_limit           numeric(12, 2) check (credit_limit is null or credit_limit >= 0),
  annual_fee_override    numeric(10, 2) check (annual_fee_override is null or annual_fee_override >= 0),
  opened_on              date,
  ledger_account_labels  text[] not null default '{}',
  params                 jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (user_id, catalogue_id)
);

create index if not exists user_cards_user_status_idx
  on public.user_cards (user_id, status);

alter table public.user_cards enable row level security;

drop policy if exists "owner can read user_cards"   on public.user_cards;
drop policy if exists "owner can insert user_cards" on public.user_cards;
drop policy if exists "owner can update user_cards" on public.user_cards;
drop policy if exists "owner can delete user_cards" on public.user_cards;

create policy "owner can read user_cards"
  on public.user_cards for select
  using (auth.uid() = user_id);

create policy "owner can insert user_cards"
  on public.user_cards for insert
  with check (auth.uid() = user_id);

create policy "owner can update user_cards"
  on public.user_cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner can delete user_cards"
  on public.user_cards for delete
  using (auth.uid() = user_id);


-- =========================================================================
-- 2. card_bucket_overrides — confirmed (note pattern) → (spend bucket).
-- =========================================================================
-- Card terms are written in merchant-category language ("10% on dining and
-- grocery"). A ledger is written in whatever language its owner chose. The
-- resolver in lib/cards/buckets.ts translates between them and flags anything it
-- resolved weakly; this table stores the user's answers so the same row is never
-- asked about twice.
--
-- Exposed now rather than in a later migration, mirroring how classification_rules
-- was added ahead of the feature that consumes it.
--
-- Same shape as classification_rules deliberately. If the two ever merge, the
-- migration is a rename plus a column, not a redesign.
--
-- NOTE: the bucket check constraint mirrors SPEND_BUCKETS in lib/cards/buckets.ts.
-- Adding a bucket to that vocabulary requires a migration here too. That coupling
-- is deliberate: a typo'd bucket silently drops spend out of the addressable base,
-- which is worse than an occasional migration.

create table if not exists public.card_bucket_overrides (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  pattern       text not null,                    -- lowercased substring of Note
  bucket        text not null check (bucket in (
                  'dining', 'food_delivery', 'quick_commerce', 'groceries',
                  'online_shopping', 'travel_flight', 'travel_hotel', 'cabs',
                  'fuel', 'utilities', 'telecom', 'entertainment', 'health',
                  'offline_retail', 'education', 'insurance',
                  'rent', 'investment', 'transfer', 'government'
                )),
  created_at    timestamptz not null default now(),
  unique (user_id, pattern)
);

create index if not exists card_bucket_overrides_user_idx
  on public.card_bucket_overrides (user_id);

alter table public.card_bucket_overrides enable row level security;

drop policy if exists "owner can read card_bucket_overrides"   on public.card_bucket_overrides;
drop policy if exists "owner can insert card_bucket_overrides" on public.card_bucket_overrides;
drop policy if exists "owner can update card_bucket_overrides" on public.card_bucket_overrides;
drop policy if exists "owner can delete card_bucket_overrides" on public.card_bucket_overrides;

create policy "owner can read card_bucket_overrides"
  on public.card_bucket_overrides for select
  using (auth.uid() = user_id);

create policy "owner can insert card_bucket_overrides"
  on public.card_bucket_overrides for insert
  with check (auth.uid() = user_id);

create policy "owner can update card_bucket_overrides"
  on public.card_bucket_overrides for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner can delete card_bucket_overrides"
  on public.card_bucket_overrides for delete
  using (auth.uid() = user_id);
