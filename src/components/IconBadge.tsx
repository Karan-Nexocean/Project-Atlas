import React from 'react';

interface IconBadgeProps {
  children: React.ReactNode;
  size?: number; // px
}

export const IconBadge: React.FC<IconBadgeProps> = ({ children, size = 48 }) => {
  const s = `${size}px`;
  return (
    <div
      className="inline-grid place-items-center rounded-xl border bg-white/80 dark:bg-white/10 border-slate-200 dark:border-white/10 shadow-sm overflow-hidden shrink-0"
      style={{ width: s, height: s }}
      aria-hidden
    >
      <div className="text-blue-600 dark:text-blue-400" style={{ lineHeight: 0 }}>{children}</div>
    </div>
  );
};
