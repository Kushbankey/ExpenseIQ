-- User settings: persistent across Excel re-uploads.
-- Both tables are owner-scoped via RLS = (user_id = auth.uid()).
--
-- To apply: paste into Supabase SQL editor and run, or `supabase db push` if CLI is wired.
-- Safe to re-run: every CREATE uses IF NOT EXISTS, every policy is dropped before recreate.

-- =========================================================================
-- 1. category_budgets — per-category monthly limits with history.
-- =========================================================================
-- Editing a budget closes the current row (sets effective_to) and inserts a
-- new row from the start of the current month. Past months therefore keep
-- their own historical limit instead of being retro-rewritten.

create table if not exists public.category_budgets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  category        text not null,
  monthly_limit   numeric(12, 2) not null check (monthly_limit >= 0),
  cadence         text not null default 'monthly' check (cadence in ('monthly', 'weekly', 'yearly')),
  effective_from  date not null default current_date,
  effective_to    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint category_budgets_period_valid check (effective_to is null or effective_to >= effective_from),
  unique (user_id, category, effective_from)
);

create index if not exists category_budgets_user_category_idx
  on public.category_budgets (user_id, category, effective_from desc);

alter table public.category_budgets enable row level security;

drop policy if exists "owner can read category_budgets"   on public.category_budgets;
drop policy if exists "owner can insert category_budgets" on public.category_budgets;
drop policy if exists "owner can update category_budgets" on public.category_budgets;
drop policy if exists "owner can delete category_budgets" on public.category_budgets;

create policy "owner can read category_budgets"
  on public.category_budgets for select
  using (auth.uid() = user_id);

create policy "owner can insert category_budgets"
  on public.category_budgets for insert
  with check (auth.uid() = user_id);

create policy "owner can update category_budgets"
  on public.category_budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner can delete category_budgets"
  on public.category_budgets for delete
  using (auth.uid() = user_id);


-- =========================================================================
-- 2. classification_rules — learned (note pattern) → (category, subcategory).
-- =========================================================================
-- Populated when the user confirms a suggestion in the auto-categorisation
-- queue. Applied on every future upload before category analysis runs.

create table if not exists public.classification_rules (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  pattern         text not null,                                              -- normalised substring of Note
  category        text not null,
  subcategory     text,
  confidence      numeric(4, 3) not null default 1.000 check (confidence between 0 and 1),
  applied_count   integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (user_id, pattern)
);

create index if not exists classification_rules_user_idx
  on public.classification_rules (user_id);

alter table public.classification_rules enable row level security;

drop policy if exists "owner can read classification_rules"   on public.classification_rules;
drop policy if exists "owner can insert classification_rules" on public.classification_rules;
drop policy if exists "owner can update classification_rules" on public.classification_rules;
drop policy if exists "owner can delete classification_rules" on public.classification_rules;

create policy "owner can read classification_rules"
  on public.classification_rules for select
  using (auth.uid() = user_id);

create policy "owner can insert classification_rules"
  on public.classification_rules for insert
  with check (auth.uid() = user_id);

create policy "owner can update classification_rules"
  on public.classification_rules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner can delete classification_rules"
  on public.classification_rules for delete
  using (auth.uid() = user_id);
