'use client';

import { useEffect, useState } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { formatINR } from '@/lib/formatters';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { SankeyData } from '@/lib/types';

interface Props {
  data: SankeyData;
}

export function IncomeSankey({ data }: Props) {
  const [isNarrow, setIsNarrow] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const handler = () => setIsNarrow(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!data.nodes.length || !data.links.length) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">No flow data yet.</div>;
  }

  const margin = isNarrow
    ? { top: 8, right: 88, bottom: 8, left: 8 }
    : { top: 10, right: 140, bottom: 10, left: 80 };

  const labelMods: Array<['brighter' | 'darker', number]> = isDark
    ? [['brighter', 1.1]]
    : [['darker', 1.6]];

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div
        style={{
          height: isNarrow ? 520 : 460,
          minWidth: isNarrow ? 560 : '100%',
        }}
      >
        <ResponsiveSankey
          data={{ nodes: data.nodes.map((n) => ({ id: n.id, nodeColor: n.nodeColor })), links: data.links }}
          margin={margin}
          align="justify"
          colors={(node: { nodeColor?: string }) => node.nodeColor || '#8b5cf6'}
          nodeOpacity={1}
          nodeHoverOthersOpacity={0.35}
          nodeThickness={isNarrow ? 10 : 14}
          nodeSpacing={isNarrow ? 10 : 16}
          nodeBorderWidth={0}
          nodeBorderRadius={3}
          linkOpacity={isDark ? 0.85 : 0.45}
          linkHoverOthersOpacity={0.1}
          linkContract={3}
          linkBlendMode={isDark ? 'normal' : 'multiply'}
          enableLinkGradient={true}
          labelPosition={isNarrow ? 'inside' : 'outside'}
          labelOrientation="horizontal"
          labelPadding={isNarrow ? 4 : 8}
          labelTextColor={{ from: 'color', modifiers: labelMods }}
          valueFormat={(v) => formatINR(Number(v))}
          theme={{
            labels: { text: { fontSize: isNarrow ? 10 : 11, fontWeight: 500 } },
            tooltip: {
              container: {
                fontSize: 12,
                background: isDark ? '#1a1a1e' : '#ffffff',
                color: isDark ? '#f5f5f7' : '#111827',
                border: `1px solid ${isDark ? '#2e2e35' : '#e5e7eb'}`,
              },
            },
          }}
        />
      </div>
    </div>
  );
}
