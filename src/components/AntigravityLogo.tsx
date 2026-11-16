import React from 'react';

export const AntigravityLogo: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <img
    src="./logo.svg"
    alt="Antigravity Dashboards & Motion Studio Logo"
    width={36}
    height={36}
    fetchPriority="high"
    className={`select-none object-contain ${className}`}
  />
);
