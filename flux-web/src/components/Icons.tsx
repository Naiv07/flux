export const FluxIcon = ({ size = 24, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square">
    <path d="M6 4 L18 12 L6 20" />
    <line x1="2" y1="12" x2="22" y2="12" />
  </svg>
);

export const TransferIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square">
    <path d="M4 8 L12 2 L20 8" />
    <line x1="12" y1="2" x2="12" y2="16" />
    <rect x="3" y="18" width="18" height="4" />
  </svg>
);

export const ConnectIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square">
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="12" r="3" />
    <line x1="9" y1="12" x2="15" y2="12" />
  </svg>
);