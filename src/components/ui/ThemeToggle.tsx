'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/components/providers/ThemeProvider';

interface ThemeToggleProps {
  /** "segmented": full 3-state control (sun/system/moon). "compact": just a single icon button that cycles. */
  variant?: 'segmented' | 'compact';
}

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export function ThemeToggle({ variant = 'segmented' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (variant === 'compact') {
    const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    const Icon = resolvedTheme === 'dark' ? Sun : Moon;
    return (
      <button
        onClick={() => setTheme(next)}
        aria-label={`Switch to ${next} mode`}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 transition-colors"
      >
        <Icon size={16} />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={selected}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selected
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
