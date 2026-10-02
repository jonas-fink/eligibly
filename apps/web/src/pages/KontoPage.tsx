import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { KontoAntwort } from '@eligibility/shared';
import {
  bestaetigeEmail,
  ladeHaushalte,
  ladeKonto,
  loescheHaushalt,
  emailErneut,
  loescheKonto,
  meldeAb,
  meldeAn,
  passwortVergessen,
  passwortZuruecksetzen,
  registriere,
} from '../api/api-client.ts';

export function KontoPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [konto, setKonto] = useState<KontoAntwort | null>(null);
  const [bekannt, setBekannt] = useState(false);
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [haushalte, setHaushalte] = useState<
    { id: string; plz: string; wohnort: string; anzahlPersonen: number; erstelltAm: string }[]
  >([]);
  const [loeschungOffen, setLoeschungOffen] = useState(false);
  const resetToken = params.get('zuruecksetzen');

  async function laden() {
    const aktuell = await ladeKonto();
    setKonto(aktuell);
    setBekannt(true);
    if (aktuell?.emailVerifiziert) {
      setHaushalte(await ladeHaushalte());
    } else {
      setHaushalte([]);
    }
  }

  useEffect(() => {
    const token = params.get('bestaetigen');
    if (!token) {
      void laden().catch(() => setFehler(t('konto.fehler')));
      return;
    }
    void bestaetigeEmail(token)
      .then(() => {
        setHinweis(t('konto.bestaetigt'));
        params.delete('bestaetigen');
        setParams(params, { replace: true });
        return laden();
      })
      .catch(() => setFehler(t('konto.fehler')));
  }, [params, setParams, t]);

  async function nachAktion(aktion: () => Promise<void>) {
    setFehler(null);
    setHinweis(null);
    try {
      await aktion();
    } catch (error) {
      setFehler(error instanceof Error ? error.message : t('konto.fehler'));
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 py-8">
      <h1 className="text-3xl">{t('konto.titel')}</h1>
      <p>{t('konto.text')}</p>
      {hinweis ? <p className="hinweis hinweis-erklaerung">{hinweis}</p> : null}
      {fehler ? <p className="hinweis hinweis-fehler">{fehler}</p> : null}

      {resetToken ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void nachAktion(async () => {
              await passwortZuruecksetzen(resetToken, passwort);
              setHinweis(t('konto.anmelden'));
              params.delete('zuruecksetzen');
              setParams(params, { replace: true });
            });
          }}
        >
          <label>
            {t('konto.neuesPasswort')}
            <input className="feld" type="password" value={passwort} onChange={(e) => setPasswort(e.target.value)} />
          </label>
          <button className="btn btn-primaer" type="submit">
            {t('konto.zuruecksetzen')}
          </button>
        </form>
      ) : null}

      {bekannt && konto ? (
        <section className="flex flex-col gap-3">
          <p>
            {konto.email}
            {konto.emailVerifiziert ? '' : ` — ${t('konto.unbestaetigt')}`}
          </p>
          {konto.emailVerifiziert ? null : (
            <button
              type="button"
              className="btn btn-neutral"
              onClick={() =>
                void nachAktion(async () => {
                  await emailErneut();
                  setHinweis(t('konto.erneutGesendet'));
                })
              }
            >
              {t('konto.erneutSenden')}
            </button>
          )}
          <h2 className="text-xl">{t('konto.haushalte')}</h2>
          {haushalte.length === 0 ? <p>{t('konto.keineHaushalte')}</p> : null}
          <ul className="flex flex-col gap-2">
            {haushalte.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3">
                <span>
                  {h.wohnort} {h.plz} · {h.anzahlPersonen}
                </span>
                <button
                  type="button"
                  className="btn btn-neutral"
                  onClick={() =>
                    void nachAktion(async () => {
                      await loescheHaushalt(h.id);
                      await laden();
                    })
                  }
                >
                  {t('konto.loeschen')}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-neutral"
            onClick={() =>
              void nachAktion(async () => {
                await meldeAb();
                setKonto(null);
                setHaushalte([]);
              })
            }
          >
            {t('konto.abmelden')}
          </button>
          <button type="button" className="btn btn-gefahr" onClick={() => setLoeschungOffen(true)}>
            {t('konto.kontoLoeschen')}
          </button>
          {loeschungOffen ? (
            <div className="loesch-frage" role="alertdialog" aria-labelledby="loeschung-titel">
              <p id="loeschung-titel">{t('konto.loeschungFragen')}</p>
              <div className="flex gap-3">
                <button type="button" className="btn btn-neutral" autoFocus onClick={() => setLoeschungOffen(false)}>
                  {t('konto.loeschungAbbrechen')}
                </button>
                <button
                  type="button"
                  className="btn btn-gefahr"
                  onClick={() =>
                    void nachAktion(async () => {
                      await loescheKonto();
                      setLoeschungOffen(false);
                      setKonto(null);
                      setHaushalte([]);
                    })
                  }
                >
                  {t('konto.loeschungBestaetigen')}
                </button>
              </div>
            </div>
          ) : null}
          <Link to="/pruefung" className="btn btn-primaer w-fit">
            {t('start.starten')}
          </Link>
        </section>
      ) : null}

      {bekannt && !konto && !resetToken ? (
        <section className="flex flex-col gap-4">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void nachAktion(async () => {
                await registriere(email, passwort);
                await laden();
              });
            }}
          >
            <label>
              {t('konto.email')}
              <input className="feld" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              {t('konto.passwort')}
              <input
                className="feld"
                type="password"
                value={passwort}
                minLength={12}
                onChange={(e) => setPasswort(e.target.value)}
                required
              />
            </label>
            <div className="flex gap-3">
              <button className="btn btn-primaer" type="submit">
                {t('konto.registrieren')}
              </button>
              <button
                className="btn btn-neutral"
                type="button"
                onClick={() =>
                  void nachAktion(async () => {
                    await meldeAn(email, passwort);
                    await laden();
                  })
                }
              >
                {t('konto.anmelden')}
              </button>
            </div>
          </form>
          <button
            type="button"
            className="btn btn-neutral"
            onClick={() =>
              void nachAktion(async () => {
                await passwortVergessen(email);
                setHinweis(t('konto.vergessenHinweis'));
              })
            }
          >
            {t('konto.vergessen')}
          </button>
        </section>
      ) : null}
    </main>
  );
}
