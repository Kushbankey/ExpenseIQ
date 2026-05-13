'use client';

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; label: string };
}

export function StatCard({ label, value, sublabel, icon, color, trend }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-[#131316] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800/80 p-4 md:p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
          <p className="text-lg md:text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100 truncate">{value}</p>
          {sublabel && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sublabel}</p>}
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}% {trend.label}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${color}22` }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
    </div>
  );
}
