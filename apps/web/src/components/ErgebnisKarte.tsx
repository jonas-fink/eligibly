import type { EligibilityResult } from '@eligibility/shared';
import { useTranslation } from 'react-i18next';
import { StatusPille } from './StatusPille.tsx';
import { statusRolle } from '../utils/statusRolle.ts';
import { formatiereEuroCent } from '../utils/format.ts';

export function ErgebnisKarte({
  ergebnis,
  nichtAusgewaehlt,
}: {
  ergebnis: EligibilityResult;
  nichtAusgewaehlt?: boolean;
}) {
  const { t } = useTranslation();
  const rolle = statusRolle(ergebnis.eligible, ergebnis.nachrangigGrund);
  return (
    <article className="ergebnis" data-rolle={rolle}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl">{t(`systeme.${ergebnis.system}`)}</h2>
        <StatusPille status={ergebnis.eligible} grund={ergebnis.nachrangigGrund} />
      </header>
      {nichtAusgewaehlt ? <p className="text-md text-ink-soft">{t('report.nichtAusgewaehlt')}</p> : null}
      <Betrag ergebnis={ergebnis} />
      {ergebnis.teilbetraege?.length ? (
        <ul className="list-disc pl-5">
          {ergebnis.teilbetraege.map((teil) => (
            <li key={teil.personId}>
              {teil.hinweis ? `${teil.hinweis}: ` : null}
              {formatiereEuroCent(teil.betragCent)}
            </li>
          ))}
        </ul>
      ) : null}
      {ergebnis.datenluecken?.length ? (
        <ul className="list-disc pl-5">
          {ergebnis.datenluecken.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : null}
      <div className="naechster-schritt">
        <p className="titel">{t('report.naechsterSchritt')}</p>
        <p>{ergebnis.naechsteSchritte.beschreibung}</p>
      </div>
      <p className="ergebnis-fussnote">{t('disclaimer')}</p>
    </article>
  );
}

function Betrag({ ergebnis }: { ergebnis: EligibilityResult }) {
  const { t } = useTranslation();
  if (ergebnis.eligible === 'nicht_pruefbar') return null;
  if (ergebnis.betragsart === 'keineGeldleistung') {
    return <p>{t('report.keineGeldleistung')}</p>;
  }
  if (ergebnis.betragSpanneCent) {
    return (
      <p className="betrag text-2xl">
        {formatiereEuroCent(ergebnis.betragSpanneCent.vonCent)} –{' '}
        {formatiereEuroCent(ergebnis.betragSpanneCent.bisCent)}{' '}
        <span className="text-base font-sans font-normal">{t('report.monatlich')}</span>
      </p>
    );
  }
  if (ergebnis.geschaetzterBetragCent !== undefined) {
    return (
      <p className="betrag text-2xl">
        {formatiereEuroCent(ergebnis.geschaetzterBetragCent)}{' '}
        <span className="text-base font-sans font-normal">{t('report.monatlich')}</span>
      </p>
    );
  }
  return null;
}
