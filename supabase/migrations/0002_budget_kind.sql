-- Add budget kind: 'ceiling' (don't exceed) vs 'target' (hit at least).
-- Existing rows remain 'ceiling'. The app's analytics layer will *suggest*
-- 'target' for Investment-classified categories that don't have a row yet,
-- so users see the right semantics on day one without a backfill.
--
-- Safe to re-run.

alter table public.category_budgets
  add column if not exists kind text not null default 'ceiling';

-- Constraint guard. Drop-and-recreate to stay idempotent across re-runs.
alter table public.category_budgets
  drop constraint if exists category_budgets_kind_valid;

alter table public.category_budgets
  add constraint category_budgets_kind_valid check (kind in ('ceiling', 'target'));
