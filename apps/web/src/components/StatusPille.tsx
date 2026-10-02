import type { EligibilityStatus, NachrangigGrund } from '@eligibility/shared';
import { statusRolle } from '../utils/statusRolle.ts';
import { StatusIcon } from './StatusIcon.tsx';
import { useTranslation } from 'react-i18next';

export function StatusPille({
  status,
  grund,
}: {
  status: EligibilityStatus;
  grund?: NachrangigGrund;
}) {
  const { t } = useTranslation();
  const rolle = statusRolle(status, grund);
  return (
    <span className="inline-flex items-center gap-2">
      <StatusIcon rolle={rolle} />
      <span className="status-pille" data-rolle={rolle}>
        {t(`status.${status}`)}
      </span>
    </span>
  );
}
