import type { EligibilityStatus, NachrangigGrund } from '@eligibility/shared';

export type Rolle = 'ja' | 'vielleicht' | 'neutral' | 'info';

export function statusRolle(
  status: EligibilityStatus,
  grund?: NachrangigGrund,
): Rolle {
  switch (status) {
    case 'ja':
      return 'ja';
    case 'vielleicht':
      return 'vielleicht';
    case 'nein':
      return 'neutral';
    case 'nicht_pruefbar':
      return 'info';
    case 'nachrangig':
      return grund === 'vermeidung' ? 'ja' : 'neutral';
  }
}
