'use client';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export function Card({ children, className = '', title, action }: CardProps) {
  return (
    <div className={`bg-white dark:bg-[#131316] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800/80 p-4 md:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
