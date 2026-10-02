import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BUNDESLAENDER,
  ERWERBSSTATUS_PRIMAER,
  SYSTEM_KEYS,
  expandiereZuSystemgruppen,
  type SystemKey,
} from '@eligibility/shared';
import { flagsFuer, useWizardStore, type WizardMitglied } from '../context/wizardStore.ts';
import { bauePruefungRequest } from '../hooks/usePruefung.ts';
import { ladeGemeinden, sendePruefung } from '../api/api-client.ts';
import { ErgebnisKarte } from '../components/ErgebnisKarte.tsx';
import { HaushaltSpeichern } from '../components/HaushaltSpeichern.tsx';

void flagsFuer;

export function WizardPage() {
  const { t } = useTranslation();
  const store = useWizardStore();
  const [laedt, setLaedt] = useState(false);

  async function pruefen() {
    setLaedt(true);
    store.setFehler(null);
    try {
      const res = await sendePruefung(bauePruefungRequest());
      store.setErgebnisse(res.ergebnisse, {
        aktuell: res.rechtsstandAktuell,
        version: res.rechtsstandVersion,
      });
    } catch {
      store.setFehler(t('report.fehler'));
    } finally {
      setLaedt(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 py-4">
      <div className="fortschritt" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} data-erledigt={store.schritt >= n} />
        ))}
      </div>
      <p className="hinweis hinweis-erklaerung">{t('wizard.session')}</p>
      {store.schritt === 1 ? <Schritt1 /> : null}
      {store.schritt === 2 ? <Schritt2 /> : null}
      {store.schritt === 3 ? <Schritt3 /> : null}
      {store.schritt === 4 ? <Schritt4 laedt={laedt} /> : null}
      {store.fehler ? <p className="hinweis hinweis-fehler">{store.fehler}</p> : null}
      <nav className="flex gap-3">
        {store.schritt > 1 ? (
          <button type="button" className="btn btn-neutral" onClick={() => store.setSchritt((store.schritt - 1) as 1)}>
            {t('wizard.zurueck')}
          </button>
        ) : null}
        {store.schritt < 3 ? (
          <button type="button" className="btn btn-primaer" onClick={() => store.setSchritt((store.schritt + 1) as 2)}>
            {t('wizard.weiter')}
          </button>
        ) : null}
        {store.schritt === 3 ? (
          <button type="button" className="btn btn-primaer" onClick={() => void pruefen()} disabled={laedt}>
            {t('wizard.pruefen')}
          </button>
        ) : null}
      </nav>
    </main>
  );
}

function Schritt1() {
  const { t } = useTranslation();
  const { wohnen, setWohnen, mitglieder, setMitglieder } = useWizardStore();
  const haupt = mitglieder.find((m) => m.istHauptantragsteller)!;
  const kind = mitglieder.find((m) => m.istKind);

  function updateHaupt(patch: Partial<WizardMitglied>) {
    setMitglieder(mitglieder.map((m) => (m.id === haupt.id ? { ...m, ...patch } : m)));
  }

  function toggleKind(an: boolean) {
    if (an && !kind) {
      setMitglieder([
        ...mitglieder,
        {
          id: 'kind',
          geburtsdatum: '2024-01-01',
          istHauptantragsteller: false,
          istPartnerDesHauptantragstellers: false,
          istKind: true,
          erwerbsstatusPrimaer: 'sonstiges',
          bruttoEuro: 0,
          nettoEuro: 0,
          kindergeldWirdBezogen: false,
        },
      ]);
    }
    if (!an) setMitglieder(mitglieder.filter((m) => !m.istKind));
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl">{t('wizard.schritt1')}</h1>
      <label>
        {t('wizard.plz')}
        <input className="feld" value={wohnen.plz} onChange={(e) => setWohnen({ plz: e.target.value })} inputMode="numeric" />
      </label>
      <label>
        {t('wizard.wohnort')}
        <input className="feld" value={wohnen.wohnort} onChange={(e) => setWohnen({ wohnort: e.target.value })} />
      </label>
      <label>
        {t('wizard.bundesland')}
        <select className="feld" value={wohnen.bundesland} onChange={(e) => setWohnen({ bundesland: e.target.value as typeof wohnen.bundesland })}>
          {BUNDESLAENDER.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>{t('wizard.wohnverhaeltnis')}</legend>
        <label className="mr-4">
          <input
            type="radio"
            checked={wohnen.wohnverhaeltnis === 'miete'}
            onChange={() => setWohnen({ wohnverhaeltnis: 'miete' })}
          />{' '}
          {t('wizard.miete')}
        </label>
        <label>
          <input
            type="radio"
            checked={wohnen.wohnverhaeltnis === 'eigentum'}
            onChange={() => setWohnen({ wohnverhaeltnis: 'eigentum' })}
          />{' '}
          {t('wizard.eigentum')}
        </label>
      </fieldset>
      <label>
        {t('wizard.kaltmiete')}
        <input
          className="feld"
          type="number"
          min={0}
          step={0.01}
          value={wohnen.kaltmieteEuro}
          onChange={(e) => setWohnen({ kaltmieteEuro: Number(e.target.value) })}
        />
      </label>
      <label>
        {t('wizard.nebenkosten')}
        <input
          className="feld"
          type="number"
          min={0}
          step={0.01}
          value={wohnen.nebenkostenEuro}
          onChange={(e) => setWohnen({ nebenkostenEuro: Number(e.target.value) })}
        />
      </label>
      <label>
        {t('wizard.heizkosten')}
        <input
          className="feld"
          type="number"
          min={0}
          step={0.01}
          value={wohnen.heizkostenEuro}
          onChange={(e) => setWohnen({ heizkostenEuro: Number(e.target.value) })}
        />
      </label>
      <label>
        {t('wizard.wohnflaeche')}
        <input
          className="feld"
          type="number"
          min={1}
          value={wohnen.wohnflaecheQm}
          onChange={(e) => setWohnen({ wohnflaecheQm: Number(e.target.value) })}
        />
      </label>
      <label>
        {t('wizard.geburtsdatum')}
        <input
          className="feld"
          type="date"
          value={haupt.geburtsdatum}
          onChange={(e) => updateHaupt({ geburtsdatum: e.target.value })}
        />
      </label>
      <label>
        {t('wizard.erwerb')}
        <select
          className="feld"
          value={haupt.erwerbsstatusPrimaer}
          onChange={(e) => updateHaupt({ erwerbsstatusPrimaer: e.target.value as WizardMitglied['erwerbsstatusPrimaer'] })}
        >
          {ERWERBSSTATUS_PRIMAER.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('wizard.brutto')}
        <input
          className="feld"
          type="number"
          min={0}
          step={0.01}
          value={haupt.bruttoEuro}
          onChange={(e) => updateHaupt({ bruttoEuro: Number(e.target.value) })}
        />
      </label>
      <label>
        {t('wizard.netto')}
        <input
          className="feld"
          type="number"
          min={0}
          step={0.01}
          value={haupt.nettoEuro}
          onChange={(e) => updateHaupt({ nettoEuro: Number(e.target.value) })}
        />
      </label>
      <label>
        <input type="checkbox" checked={!!kind} onChange={(e) => toggleKind(e.target.checked)} /> {t('wizard.kindHinzufuegen')}
      </label>
      {kind ? (
        <>
          <label>
            {t('wizard.kindGeburtsdatum')}
            <input
              className="feld"
              type="date"
              value={kind.geburtsdatum}
              onChange={(e) =>
                setMitglieder(mitglieder.map((m) => (m.istKind ? { ...m, geburtsdatum: e.target.value } : m)))
              }
            />
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={kind.kindergeldWirdBezogen === true}
              onChange={(e) =>
                setMitglieder(
                  mitglieder.map((m) => (m.istKind ? { ...m, kindergeldWirdBezogen: e.target.checked } : m)),
                )
              }
            />
            {t('wizard.kindergeld')}
          </label>
        </>
      ) : null}
    </section>
  );
}

function Schritt2() {
  const { t } = useTranslation();
  const { interessierendeSysteme, setSysteme } = useWizardStore();
  function toggle(key: SystemKey) {
    if (interessierendeSysteme.includes(key)) {
      setSysteme(interessierendeSysteme.filter((k) => k !== key));
    } else {
      setSysteme([...interessierendeSysteme, key]);
    }
  }
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl">{t('wizard.schritt2')}</h1>
      <p className="hinweis hinweis-erklaerung">{t('wizard.gruppeHinweis')}</p>
      {SYSTEM_KEYS.map((key) => (
        <label key={key} className="flex items-center gap-3">
          <input type="checkbox" checked={interessierendeSysteme.includes(key)} onChange={() => toggle(key)} />
          {t(`systeme.${key}`)}
        </label>
      ))}
    </section>
  );
}

function Schritt3() {
  const { t } = useTranslation();
  const {
    interessierendeSysteme,
    elterngeld,
    setElterngeld,
    wohngeld,
    setWohngeld,
    unterhaltsvorschuss,
    setUnterhaltsvorschuss,
    kinderzuschlag,
    setKinderzuschlag,
    mitglieder,
    wohnen,
  } = useWizardStore();
  const gruppe = expandiereZuSystemgruppen(interessierendeSysteme);
  const zeigtElterngeld = gruppe.includes('elterngeld');
  const zeigtWohngeld = gruppe.includes('wohngeld');
  const zeigtUnterhaltsvorschuss = gruppe.includes('unterhaltsvorschuss');
  const zeigtKinderzuschlag = gruppe.includes('kinderzuschlag') && mitglieder.some((m) => m.istKind);
  const [gemeinden, setGemeinden] = useState<{ ags: string; name: string; mietstufe?: number }[]>([]);
  const [gemeindeHinweis, setGemeindeHinweis] = useState<string | null>(null);

  useEffect(() => {
    if (!zeigtWohngeld || !/^\d{5}$/.test(wohnen.plz)) return;
    let aktiv = true;
    void ladeGemeinden(wohnen.plz)
      .then((res) => {
        if (!aktiv) return;
        setGemeinden(res.gemeinden);
        if (res.mietstufeEindeutig && res.gemeinden[0]) {
          setWohngeld({ gemeindeschluessel: res.gemeinden[0].ags });
          setGemeindeHinweis(null);
        } else if (res.gemeinden.length > 1) {
          setGemeindeHinweis(t('wohngeld.gemeindeWaehlen'));
        } else if (res.gemeinden.length === 0) {
          setGemeindeHinweis(t('wohngeld.keineGemeinde'));
        }
      })
      .catch(() => {
        if (aktiv) setGemeindeHinweis(t('wohngeld.gemeindeFehler'));
      });
    return () => {
      aktiv = false;
    };
  }, [zeigtWohngeld, wohnen.plz, setWohngeld, t]);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl">{t('wizard.schritt3')}</h1>
      {zeigtWohngeld ? (
        <>
          {gemeindeHinweis ? <p className="hinweis hinweis-erklaerung">{gemeindeHinweis}</p> : null}
          {gemeinden.length > 1 ? (
            <label>
              {t('wohngeld.gemeinde')}
              <select
                className="feld"
                value={wohngeld.gemeindeschluessel}
                onChange={(e) => setWohngeld({ gemeindeschluessel: e.target.value })}
              >
                <option value="">{t('wohngeld.gemeindePlatzhalter')}</option>
                {gemeinden.map((g) => (
                  <option key={g.ags} value={g.ags}>
                    {g.name}
                    {g.mietstufe ? ` (Mietstufe ${g.mietstufe})` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {wohnen.wohnverhaeltnis === 'eigentum' ? (
            <>
              <label>
                {t('wohngeld.zinsTilgung')}
                <input
                  className="feld"
                  type="number"
                  min={0}
                  step={0.01}
                  value={wohngeld.zinsenUndTilgungMonatlichEuro}
                  onChange={(e) => setWohngeld({ zinsenUndTilgungMonatlichEuro: Number(e.target.value) })}
                />
              </label>
              <label>
                {t('wohngeld.grundsteuer')}
                <input
                  className="feld"
                  type="number"
                  min={0}
                  step={0.01}
                  value={wohngeld.grundsteuerJaehrlichEuro}
                  onChange={(e) => setWohngeld({ grundsteuerJaehrlichEuro: Number(e.target.value) })}
                />
              </label>
            </>
          ) : null}
        </>
      ) : null}
      {zeigtKinderzuschlag ? (
        <label>
          {t('kinderzuschlag.kindEinkommen')}
          <input
            className="feld"
            type="number"
            min={0}
            step={0.01}
            value={kinderzuschlag.kindEinkommenEuro}
            onChange={(e) => setKinderzuschlag({ kindEinkommenEuro: Number(e.target.value) })}
          />
        </label>
      ) : null}
      {zeigtUnterhaltsvorschuss ? (
        <>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={unterhaltsvorschuss.andererElternteilZahltKeinenOderUnzureichendenUnterhalt}
              onChange={(e) =>
                setUnterhaltsvorschuss({
                  andererElternteilZahltKeinenOderUnzureichendenUnterhalt: e.target.checked,
                })
              }
            />
            {t('unterhaltsvorschuss.keinUnterhalt')}
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={unterhaltsvorschuss.andererElternteilIstUnbekanntOderVerstorben}
              onChange={(e) =>
                setUnterhaltsvorschuss({ andererElternteilIstUnbekanntOderVerstorben: e.target.checked })
              }
            />
            {t('unterhaltsvorschuss.unbekannt')}
          </label>
        </>
      ) : null}
      {zeigtElterngeld ? (
        <>
          <label>
            {t('elterngeld.nettoVorGeburt')}
            <input
              className="feld"
              type="number"
              min={0}
              step={0.01}
              value={elterngeld.nettoeinkommenVorGeburtMonatlichEuro}
              onChange={(e) => setElterngeld({ nettoeinkommenVorGeburtMonatlichEuro: Number(e.target.value) })}
            />
          </label>
          <label>
            {t('elterngeld.zvE')}
            <input
              className="feld"
              type="number"
              min={0}
              step={0.01}
              value={elterngeld.zuVersteuerndesEinkommenVorjahrEuro}
              onChange={(e) => setElterngeld({ zuVersteuerndesEinkommenVorjahrEuro: Number(e.target.value) })}
            />
          </label>
          <label>
            {t('elterngeld.stunden')}
            <input
              className="feld"
              type="number"
              min={0}
              value={elterngeld.wochenstundenWaehrendBezug}
              onChange={(e) => setElterngeld({ wochenstundenWaehrendBezug: Number(e.target.value) })}
            />
          </label>
          <label>
            {t('elterngeld.variante')}
            <select
              className="feld"
              value={elterngeld.gewaehlteVariante}
              onChange={(e) => setElterngeld({ gewaehlteVariante: e.target.value as 'basis' | 'elterngeldPlus' })}
            >
              <option value="basis">{t('elterngeld.basis')}</option>
              <option value="elterngeldPlus">{t('elterngeld.plus')}</option>
            </select>
          </label>
        </>
      ) : null}
      {!zeigtElterngeld && !zeigtWohngeld && !zeigtUnterhaltsvorschuss && !zeigtKinderzuschlag ? (
        <p className="hinweis hinweis-erklaerung">{t('wizard.gruppeHinweis')}</p>
      ) : null}
    </section>
  );
}

function Schritt4({ laedt }: { laedt: boolean }) {
  const { t } = useTranslation();
  const { ergebnisse, interessierendeSysteme, rechtsstandAktuell, rechtsstandVersion } = useWizardStore();
  if (laedt) return <p>{t('report.laden')}</p>;
  if (!ergebnisse) return <p>{t('report.fehler')}</p>;
  const haupt = ergebnisse.filter(
    (e) => interessierendeSysteme.includes(e.system) || e.eligible === 'ja' || e.eligible === 'vielleicht',
  );
  const rest = ergebnisse.filter((e) => !haupt.includes(e));
  const monat = new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl">{t('report.titel')}</h1>
      <p>{t('report.stichtag', { monat })}</p>
      {!rechtsstandAktuell ? <p className="hinweis hinweis-rueckfrage">{t('report.veraltet')}</p> : null}
      <p className="text-sm text-ink-soft">{rechtsstandVersion}</p>
      {haupt.map((e) => (
        <ErgebnisKarte key={e.system} ergebnis={e} nichtAusgewaehlt={!interessierendeSysteme.includes(e.system)} />
      ))}
      <HaushaltSpeichern />
      {rest.length ? (
        <details>
          <summary>
            {t('report.auchGeprueft')}: {rest.map((e) => t(`systeme.${e.system}`)).join(', ')}
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            {rest.map((e) => (
              <ErgebnisKarte key={e.system} ergebnis={e} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
