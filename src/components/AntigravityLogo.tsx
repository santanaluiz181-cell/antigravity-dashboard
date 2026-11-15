import React from 'react';

export const AntigravityLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Google Antigravity Official MarkSlot"
  >
    <rect x="1" y="1" width="34" height="34" rx="8" fill="#13161B" stroke="#232832" strokeWidth="1.5" />
    <path
      d="M18 7.5L26.5 24.5H22.2L19.9 19.6H16.1L13.8 24.5H9.5L18 7.5ZM18 13.1L16.7 16.4H19.3L18 13.1Z"
      fill="#E6EAF0"
    />
    <circle cx="18" cy="27.5" r="1.75" fill="#8AB4F8" />
    <path
      d="M11 11.5C13.1 9.1 15.4 8 18 8C20.6 8 22.9 9.1 25 11.5"
      stroke="#8AB4F8"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeOpacity="0.55"
    />
  </svg>
);
