import type { Rolle } from '../utils/statusRolle.ts';

export function StatusIcon({ rolle }: { rolle: Rolle }) {
  const common = {
    width: 24,
    height: 24,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    'aria-hidden': true as const,
  };
  if (rolle === 'ja') {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M5 12.5 10 17l9-10" />
      </svg>
    );
  }
  if (rolle === 'vielleicht') {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M7 12h10M12 5v14M8 8c2-2 6-2 8 0M8 16c2 2 6 2 8 0" />
      </svg>
    );
  }
  if (rolle === 'info') {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 10v6M12 7.5h.01" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12h8" />
    </svg>
  );
}
