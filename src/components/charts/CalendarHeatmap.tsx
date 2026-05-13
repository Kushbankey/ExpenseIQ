'use client';

import { useMemo, useState } from 'react';
import type { CalendarHeatmapCell } from '@/lib/types';
import { formatINR, formatDate } from '@/lib/formatters';

interface Props {
  calendar: CalendarHeatmapCell[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function parseDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function intensityColor(amount: number, max: number): string {
  if (amount === 0) return '#f3f4f6';
  const ratio = Math.min(1, amount / max);
  // 5-step purple ramp
  if (ratio < 0.05) return '#ede9fe';
  if (ratio < 0.15) return '#ddd6fe';
  if (ratio < 0.35) return '#c4b5fd';
  if (ratio < 0.6) return '#a78bfa';
  return '#7c3aed';
}

export function CalendarHeatmap({ calendar }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { weeks, max, monthMarkers } = useMemo(() => {
    if (calendar.length === 0) {
      return { weeks: [] as CalendarHeatmapCell[][], max: 0, monthMarkers: [] as { x: number; label: string }[] };
    }

    const map = new Map(calendar.map((c) => [c.date, c]));
    const first = parseDate(calendar[0].date);
    const last = parseDate(calendar[calendar.length - 1].date);

    // Align start to the Sunday of the first week
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());

    const weeks: CalendarHeatmapCell[][] = [];
    let max = 0;
    const monthMarkers: { x: number; label: string }[] = [];
    let lastMonth = -1;

    for (let d = new Date(start); d <= last; d.setDate(d.getDate() + 7)) {
      const week: CalendarHeatmapCell[] = [];
      for (let i = 0; i < 7; i++) {
        const cur = new Date(d);
        cur.setDate(d.getDate() + i);
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
        if (cur < first || cur > last) {
          week.push({ date: key, amount: 0, count: 0 });
        } else {
          const cell = map.get(key) || { date: key, amount: 0, count: 0 };
          week.push(cell);
          if (cell.amount > max) max = cell.amount;
          if (cur.getMonth() !== lastMonth && i === 0) {
            monthMarkers.push({ x: weeks.length, label: MONTH_LABELS[cur.getMonth()] });
            lastMonth = cur.getMonth();
          }
        }
      }
      weeks.push(week);
    }

    return { weeks, max, monthMarkers };
  }, [calendar]);

  if (weeks.length === 0) {
    return <div className="text-sm text-gray-400 py-8 text-center">No data yet.</div>;
  }

  const cellSize = 12;
  const gap = 3;
  const colWidth = cellSize + gap;
  const totalWidth = weeks.length * colWidth;
  const totalHeight = 7 * colWidth + 18; // 18 for top month labels

  const flatCells: CalendarHeatmapCell[] = weeks.flat();
  const hoverCell = hoverIdx !== null ? flatCells[hoverIdx] : null;

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <div className="relative inline-block min-w-full">
          <svg width={totalWidth + 30} height={totalHeight}>
            {/* Day-of-week labels */}
            {DAY_LABELS.map((label, i) => (
              <text
                key={i}
                x={0}
                y={18 + i * colWidth + 9}
                fontSize={9}
                fill="#9ca3af"
              >
                {label}
              </text>
            ))}
            {/* Month labels */}
            {monthMarkers.map((m, i) => (
              <text
                key={i}
                x={30 + m.x * colWidth}
                y={10}
                fontSize={10}
                fill="#9ca3af"
              >
                {m.label}
              </text>
            ))}
            {/* Cells */}
            {weeks.map((week, wIdx) =>
              week.map((cell, dIdx) => {
                const flatIdx = wIdx * 7 + dIdx;
                return (
                  <rect
                    key={cell.date}
                    x={30 + wIdx * colWidth}
                    y={18 + dIdx * colWidth}
                    width={cellSize}
                    height={cellSize}
                    rx={2}
                    ry={2}
                    fill={intensityColor(cell.amount, max)}
                    onMouseEnter={() => setHoverIdx(flatIdx)}
                    onMouseLeave={() => setHoverIdx(null)}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })
            )}
          </svg>
        </div>
      </div>

      {/* Hover info + Legend */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="text-gray-600 min-h-[18px]">
          {hoverCell && hoverCell.count > 0 ? (
            <>
              <span className="font-medium text-gray-900">{formatDate(parseDate(hoverCell.date))}</span>
              <span className="mx-1.5 text-gray-300">·</span>
              <span>{formatINR(hoverCell.amount)}</span>
              <span className="ml-1.5 text-gray-400">({hoverCell.count} txn{hoverCell.count !== 1 ? 's' : ''})</span>
            </>
          ) : hoverCell ? (
            <>
              <span className="font-medium text-gray-900">{formatDate(parseDate(hoverCell.date))}</span>
              <span className="mx-1.5 text-gray-300">·</span>
              <span className="text-gray-400">No spend</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 text-gray-400">
          <span>Less</span>
          {['#f3f4f6', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#7c3aed'].map((c) => (
            <span key={c} className="inline-block rounded-sm" style={{ width: 10, height: 10, backgroundColor: c }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
