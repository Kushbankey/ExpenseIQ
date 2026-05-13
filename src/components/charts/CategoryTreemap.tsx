'use client';

import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { formatINR, formatCompactINR } from '@/lib/formatters';
import { CATEGORY_COLORS } from '@/lib/constants';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { CategoryTotal } from '@/lib/types';

interface Props {
  categories: CategoryTotal[];
}

const FALLBACK = '#8b5cf6';

interface TreemapDatum {
  name: string;
  size: number;
  count: number;
  fill: string;
  [key: string]: string | number;
}

interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  size?: number;
  fill?: string;
  strokeColor?: string;
}

function TreemapContent(props: TreemapContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = '', size = 0, fill = FALLBACK, strokeColor = '#fff' } = props;
  const showLabel = width > 70 && height > 36;
  const showAmount = width > 70 && height > 56;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ fill, stroke: strokeColor, strokeWidth: 2 }}
        rx={4}
        ry={4}
      />
      {showLabel && (
        <text
          x={x + 8}
          y={y + 20}
          fontSize={12}
          fontWeight={600}
          stroke="none"
          style={{ fill: '#fff', stroke: 'none', pointerEvents: 'none' }}
        >
          {name}
        </text>
      )}
      {showAmount && (
        <text
          x={x + 8}
          y={y + 38}
          fontSize={11}
          stroke="none"
          style={{ fill: '#fff', stroke: 'none', fillOpacity: 0.85, pointerEvents: 'none' }}
        >
          {formatCompactINR(size)}
        </text>
      )}
    </g>
  );
}

export function CategoryTreemap({ categories }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const stroke = isDark ? '#0a0a0c' : '#fff';

  const data: TreemapDatum[] = categories.map((c) => ({
    name: c.category,
    size: c.total,
    count: c.count,
    fill: CATEGORY_COLORS[c.category] || FALLBACK,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={data}
        dataKey="size"
        stroke={stroke}
        content={<TreemapContent strokeColor={stroke} />}
        isAnimationActive={false}
      >
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload || !payload[0]) return null;
            const d = payload[0].payload as TreemapDatum;
            return (
              <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm px-3 py-2 text-xs">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{d.name}</p>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{formatINR(d.size)}</p>
                <p className="text-gray-400 dark:text-gray-500">{d.count} txns</p>
              </div>
            );
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
