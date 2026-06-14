'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { CategoryBudgetStatus, BudgetStatus, BudgetKind } from '@/lib/types';
import { formatCompactINR, formatINR } from '@/lib/formatters';

interface CategoryBudgetRowProps {
  status: CategoryBudgetStatus;
  onSave: (category: string, limit: number, kind: BudgetKind) => Promise<void>;
  onKindChange?: (category: string, kind: BudgetKind) => Promise<void>;
  onDelete?: (category: string) => Promise<void>;
}

// Colour tokens per status. Red and amber map to "needs attention" regardless
// of kind; green to healthy. Each status also carries a verb-style label.
const STATUS_STYLES: Record<BudgetStatus, { bar: string; text: string; label: string }> = {
  // Ceiling statuses
  'over':     { bar: 'bg-red-500',     text: 'text-red-500 dark:text-red-300',          label: 'Over' },
  'watch':    { bar: 'bg-amber-500',   text: 'text-amber-500 dark:text-amber-300',      label: 'Watch' },
  'on-pace':  { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-300',  label: 'On pace' },
  // Target statuses
  'missed':   { bar: 'bg-red-500',     text: 'text-red-500 dark:text-red-300',          label: 'Missed' },
  'behind':   { bar: 'bg-amber-500',   text: 'text-amber-500 dark:text-amber-300',      label: 'Behind' },
  'on-track': { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-300',  label: 'On track' },
  'achieved': { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-300',  label: 'Achieved' },
  // Empty
  'no-budget': { bar: 'bg-gray-300',   text: 'text-gray-500 dark:text-gray-400',        label: 'No budget' },
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// Phrasing helpers: target mode uses "Invested / Target / Achieved" language
// instead of "Spent / Limit / Over". Keeps the page honest about what each
// row is actually measuring.
function spentVerb(kind: BudgetKind, capitalize = true): string {
  const v = kind === 'target' ? 'invested' : 'spent';
  return capitalize ? v[0].toUpperCase() + v.slice(1) : v;
}

function limitNoun(kind: BudgetKind): string {
  return kind === 'target' ? 'target' : 'budget';
}

export function CategoryBudgetRow({ status, onSave, onKindChange, onDelete }: CategoryBudgetRowProps) {
  const limitStr = status.monthlyLimit === null ? '' : String(Math.round(status.monthlyLimit));
  const [input, setInput] = useState<string>(limitStr);
  const [lastSaved, setLastSaved] = useState<string>(limitStr);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync input when the underlying limit changes from outside (hydrate
  // completes after first paint, or another tab edits). Adjusting state during
  // render is React's recommended pattern for prop→state sync.
  // See https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [syncedLimit, setSyncedLimit] = useState(limitStr);
  if (limitStr !== syncedLimit) {
    setSyncedLimit(limitStr);
    setInput(limitStr);
    setLastSaved(limitStr);
  }

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  const commit = useCallback(async () => {
    const trimmed = input.trim();
    if (trimmed === lastSaved) return;
    const parsed = trimmed === '' ? NaN : Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setInput(lastSaved);
      return;
    }
    setSaveState('saving');
    try {
      await onSave(status.category, parsed, status.kind);
      const next = String(Math.round(parsed));
      setLastSaved(next);
      setInput(next);
      setSaveState('saved');
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState('idle'), 1500);
    } catch {
      setSaveState('error');
      setInput(lastSaved);
    }
  }, [input, lastSaved, onSave, status.category, status.kind]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
    if (e.key === 'Escape') {
      setInput(lastSaved);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleDelete = async () => {
    if (!onDelete || status.monthlyLimit === null) return;
    await onDelete(status.category);
  };

  const handleToggleKind = async () => {
    if (!onKindChange || status.monthlyLimit === null) return;
    await onKindChange(status.category, status.kind === 'ceiling' ? 'target' : 'ceiling');
  };

  const styles = STATUS_STYLES[status.status];
  const pctClamped = Math.min(100, status.pctUsed);
  const hasBudget = status.monthlyLimit !== null;
  const daysRemaining = Math.max(0, status.daysInMonth - status.daysElapsed);
  const isTarget = status.kind === 'target';

  const roundForBudget = (v: number): number => {
    if (v < 2000) return Math.round(v / 100) * 100;
    if (v < 20000) return Math.round(v / 500) * 500;
    return Math.round(v / 1000) * 1000;
  };

  const prefillFromAvg = () => {
    if (status.trailing3Avg <= 0) return;
    setInput(String(roundForBudget(status.trailing3Avg)));
  };

  // Side text under the progress bar — phrased per kind so it reads right.
  let footerLeft: React.ReactNode;
  if (isTarget) {
    if (status.remaining > 0) {
      footerLeft = (
        <>{formatCompactINR(status.remaining)} to go · {daysRemaining} days left</>
      );
    } else {
      footerLeft = <>Achieved {formatCompactINR(-status.remaining)} over target</>;
    }
  } else {
    footerLeft = status.remaining >= 0
      ? <>{formatCompactINR(status.remaining)} left · {daysRemaining} days to go</>
      : <>Over by {formatCompactINR(-status.remaining)}</>;
  }

  // Right-side idle hint: ceiling shows pace; target shows the daily commit
  // still needed to hit the target.
  const idleHint = isTarget
    ? (status.remaining > 0 && daysRemaining > 0 ? `${formatCompactINR(status.remaining / daysRemaining)}/day to hit target` : '')
    : (status.remaining >= 0 && daysRemaining > 0 ? `${formatCompactINR(status.dailyPaceRemaining)}/day pace` : '');

  return (
    <div className="flex flex-col gap-3 p-4 bg-white dark:bg-[#131316] rounded-2xl border border-gray-100 dark:border-gray-800/80">
      {/* Header: name + status + input + kind toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{status.category}</span>
            <span className={`text-xs font-medium ${styles.text}`}>{styles.label}</span>
            {/* Kind toggle — visible only when a budget exists. Lets the user
                flip ceiling ↔ target (useful if auto-detection guessed wrong). */}
            {hasBudget && onKindChange && (
              <button
                type="button"
                onClick={handleToggleKind}
                title={isTarget
                  ? 'Currently a target (hit at least). Click to switch to a spending limit.'
                  : 'Currently a spending limit (don\'t exceed). Click to switch to a target.'}
                className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/80"
              >
                {isTarget ? '🎯 Target' : '🚫 Limit'}
              </button>
            )}
          </div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {hasBudget
              ? <>{spentVerb(status.kind)} {formatINR(status.spent)} of {formatINR(status.monthlyLimit!)} {limitNoun(status.kind)} · {status.pctUsed.toFixed(0)}%</>
              : <>{spentVerb(status.kind)} {formatINR(status.spent)} this month · {status.daysElapsed}/{status.daysInMonth} days</>}
          </div>
          {status.trailing3MonthCount > 0 && (
            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5">
              <button
                type="button"
                onClick={prefillFromAvg}
                title={`Click to prefill ${formatCompactINR(roundForBudget(status.trailing3Avg))} (last ${status.trailing3MonthCount} mo avg)`}
                className="hover:text-violet-600 dark:hover:text-violet-300 transition-colors underline-offset-2 hover:underline cursor-pointer"
              >
                Avg {formatCompactINR(status.trailing3Avg)}/mo
                {status.trailing3MonthCount < 3 ? ` (${status.trailing3MonthCount}mo)` : ''}
              </button>
              <span>Last month {formatCompactINR(status.lastMonthSpent)}</span>
              {status.lifetimeMonthlyAvg > 0 && Math.abs(status.lifetimeMonthlyAvg - status.trailing3Avg) > 100 && (
                <span title="Average over all completed months">
                  Lifetime {formatCompactINR(status.lifetimeMonthlyAvg)}/mo
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-2 flex items-center text-xs text-gray-400 dark:text-gray-500">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={input}
              placeholder={isTarget ? 'Set target' : 'Set limit'}
              onChange={(e) => setInput(e.target.value)}
              onBlur={commit}
              onKeyDown={onKeyDown}
              className="w-28 pl-5 pr-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          {hasBudget && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              title="Remove budget"
              className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-300 px-1"
              aria-label="Remove budget"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Progress bar (only meaningful when a budget exists) */}
      {hasBudget && (
        <div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800/60 rounded-full overflow-hidden relative">
            <div
              className={`h-full ${styles.bar} transition-all`}
              style={{ width: `${pctClamped}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-px bg-gray-400 dark:bg-gray-500"
              style={{ left: `${Math.min(100, (status.daysElapsed / status.daysInMonth) * 100)}%` }}
              title="Linear pace marker"
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{footerLeft}</span>
            <span className={saveState === 'error' ? 'text-red-500 dark:text-red-300' : ''}>
              {saveState === 'saving' && 'Saving…'}
              {saveState === 'saved' && '✓ Saved'}
              {saveState === 'error' && 'Save failed'}
              {saveState === 'idle' && idleHint}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
