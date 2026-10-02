import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { KontoAntwort } from '@eligibility/shared';
import { ladeKonto, speichereHaushalt } from '../api/api-client.ts';
import { useWizardStore } from '../context/wizardStore.ts';
import { bauePruefungRequest } from '../hooks/usePruefung.ts';

export function HaushaltSpeichern() {
  const { t } = useTranslation();
  const ergebnisse = useWizardStore((s) => s.ergebnisse);
  const [konto, setKonto] = useState<KontoAntwort | null>(null);
  const [einwilligung, setEinwilligung] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    void ladeKonto()
      .then(setKonto)
      .catch(() => setKonto(null));
  }, []);

  if (!konto) {
    return (
      <p>
        {t('report.speichernLogin')} <Link to="/konto">{t('report.zumKonto')}</Link>
      </p>
    );
  }
  if (!konto.emailVerifiziert) {
    return (
      <p>
        {t('report.speichernEmail')} <Link to="/konto">{t('report.zumKonto')}</Link>
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const request = bauePruefungRequest();
        setFehler(null);
        void speichereHaushalt({
          einwilligung: true,
          haushalt: request.haushalt,
          systemSpecificAnswers: request.systemSpecificAnswers,
          ergebnisse: ergebnisse ?? undefined,
        })
          .then(() => setHinweis(t('report.gespeichert')))
          .catch((error: unknown) => setFehler(error instanceof Error ? error.message : t('report.fehler')));
      }}
    >
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={einwilligung}
          onChange={(e) => setEinwilligung(e.target.checked)}
          required
        />
        {t('report.einwilligung')}
      </label>
      <button className="btn btn-primaer" type="submit" disabled={!einwilligung}>
        {t('report.speichern')}
      </button>
      {hinweis ? <p className="hinweis hinweis-erklaerung">{hinweis}</p> : null}
      {fehler ? <p className="hinweis hinweis-fehler">{fehler}</p> : null}
    </form>
  );
}
