import React from 'react';

interface IconBadgeProps {
  children: React.ReactNode;
  size?: number; // px
}

export const IconBadge: React.FC<IconBadgeProps> = ({ children, size = 48 }) => {
  const s = `${size}px`;
  return (
    <div
      className="neo-card rounded-xl grid place-items-center shadow-lg"
      style={{ width: s, height: s }}
    >
      <div className="text-v-turquoise" style={{ lineHeight: 0 }}>{children}</div>
    </div>
  );
};

