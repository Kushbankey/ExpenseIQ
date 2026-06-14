'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export interface TabDef {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: TabDef[];
  paramKey?: string;       // URL search-param name; defaults to "tab"
  defaultValue?: string;   // tab to use if param is missing/invalid
  className?: string;
}

// URL-driven tab strip. Active tab is reflected as ?tab=<value> in the URL,
// so reload + deep-link both work. Uses window.history.pushState (Next 16
// idiomatic for in-place URL state) instead of router.replace so the route
// tree doesn't re-render on tab switch.
export function Tabs({ tabs, paramKey = 'tab', defaultValue, className = '' }: TabsProps) {
  const params = useSearchParams();

  const current = params.get(paramKey);
  const active = tabs.find((t) => t.value === current)?.value
    ?? defaultValue
    ?? tabs[0]?.value;

  const select = useCallback((value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(paramKey, value);
    window.history.pushState(null, '', `?${next.toString()}`);
  }, [params, paramKey]);

  return (
    <div
      role="tablist"
      className={`inline-flex p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl ${className}`}
    >
      {tabs.map((t) => {
        const isActive = t.value === active;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => select(t.value)}
            className={
              `px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ` +
              (isActive
                ? 'bg-white dark:bg-[#131316] text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// Companion hook for the parent page: returns the active tab value matching
// the strip above, so the parent can decide which panel to render.
export function useActiveTab(tabs: TabDef[], paramKey = 'tab', defaultValue?: string): string {
  const params = useSearchParams();
  const current = params.get(paramKey);
  return tabs.find((t) => t.value === current)?.value
    ?? defaultValue
    ?? tabs[0]?.value
    ?? '';
}
