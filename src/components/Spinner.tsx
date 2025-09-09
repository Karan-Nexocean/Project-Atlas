import React from 'react';

interface SpinnerProps {
  size?: number; // in px
  className?: string;
  label?: string; // accessible
}

// Brand spinner using CSS conic-gradient — smooth and GPU-friendly
export const Spinner: React.FC<SpinnerProps> = ({ size = 56, className = '', label = 'Loading' }) => {
  const s = `${size}px`;
  return (
    <div className="relative inline-grid place-items-center" role="status" aria-live="polite" aria-label={label}>
      <div className={`atlas-spinner ${className}`} style={{ ['--vs' as any]: s }} />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default Spinner;
