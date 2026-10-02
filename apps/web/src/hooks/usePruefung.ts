import { expandiereZuSystemgruppen, type PruefungRequest, type SystemKey } from '@eligibility/shared';
import { flagsFuer, useWizardStore } from '../context/wizardStore.ts';

export function bauePruefungRequest(): PruefungRequest {
  const s = useWizardStore.getState();
  const stichtag = new Date().toISOString().slice(0, 10);
  return {
    haushalt: {
      id: 'session',
      erstelltAm: stichtag,
      pruefungsStichtag: stichtag,
      rechtsstandVersion: '2026-01',
      mitglieder: s.mitglieder.map((m) => {
        const bruttoEuro = Math.max(m.bruttoEuro, m.nettoEuro);
        const flags = flagsFuer(m.erwerbsstatusPrimaer);
        return {
          id: m.id,
          geburtsdatum: m.geburtsdatum,
          istHauptantragsteller: m.istHauptantragsteller,
          istPartnerDesHauptantragstellers: m.istPartnerDesHauptantragstellers,
          istKind: m.istKind,
          erwerbsstatusPrimaer: m.erwerbsstatusPrimaer,
          ...flags,
          einkommen: {
            bruttoMonatlichCent: bruttoEuro,
            nettoMonatlichCent: m.nettoEuro,
            arten: {
              erwerbstaetigkeitCent: bruttoEuro,
              renteCent: 0,
              kapitalertraegeCent: 0,
              sonstigeCent: 0,
            },
          },
          vermoegenCent: 0,
          ...(m.istKind ? { kindergeldWirdBezogen: m.kindergeldWirdBezogen === true } : {}),
        };
      }),
      wohnsituation: {
        plz: s.wohnen.plz,
        wohnort: s.wohnen.wohnort,
        bundesland: s.wohnen.bundesland,
        wohnverhaeltnis: s.wohnen.wohnverhaeltnis,
        kaltmieteCent: s.wohnen.kaltmieteEuro,
        nebenkostenCent: s.wohnen.nebenkostenEuro,
        heizkostenCent: s.wohnen.heizkostenEuro,
        wohnflaecheQm: s.wohnen.wohnflaecheQm,
      },
    },
    interessierendeSysteme: s.interessierendeSysteme,
    systemSpecificAnswers: answersFuer(s.interessierendeSysteme),
  };
}

function answersFuer(auswahl: SystemKey[]): Record<string, unknown> | undefined {
  const gruppe = expandiereZuSystemgruppen(auswahl);
  const out: Record<string, unknown> = {};
  const s = useWizardStore.getState();

  if (gruppe.includes('elterngeld')) {
    const e = s.elterngeld;
    out.elterngeld = {
      geburtsdatumKind: e.geburtsdatumKind,
      nettoeinkommenVorGeburtMonatlichCent: e.nettoeinkommenVorGeburtMonatlichEuro,
      zuVersteuerndesEinkommenVorjahrCent: e.zuVersteuerndesEinkommenVorjahrEuro,
      wochenstundenWaehrendBezug: e.wochenstundenWaehrendBezug,
      gewaehlteVariante: e.gewaehlteVariante,
    };
  }

  if (gruppe.includes('unterhaltsvorschuss')) {
    const u = s.unterhaltsvorschuss;
    out.unterhaltsvorschuss = {
      andererElternteilZahltKeinenOderUnzureichendenUnterhalt:
        u.andererElternteilZahltKeinenOderUnzureichendenUnterhalt,
      andererElternteilIstUnbekanntOderVerstorben: u.andererElternteilIstUnbekanntOderVerstorben,
    };
  }

  if (gruppe.includes('kinderzuschlag') && s.kinderzuschlag.kindEinkommenEuro > 0) {
    out.kinderzuschlag = {
      kindEinkommenMonatlichCent: s.kinderzuschlag.kindEinkommenEuro,
    };
  }

  if (gruppe.includes('wohngeld')) {
    const w = s.wohngeld;
    out.wohngeld = {
      ...(w.gemeindeschluessel ? { gemeindeschluessel: w.gemeindeschluessel } : {}),
      ...(s.wohnen.wohnverhaeltnis === 'eigentum'
        ? {
            zinsenUndTilgungMonatlichCent: w.zinsenUndTilgungMonatlichEuro,
            grundsteuerJaehrlichCent: w.grundsteuerJaehrlichEuro,
          }
        : {}),
    };
  }

  return Object.keys(out).length ? out : undefined;
}
