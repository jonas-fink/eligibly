import { describe, expect, it } from 'vitest';
import { ergaenzeHaushalt, HaushaltEingabeSchema, type SystemKey } from '@eligibility/shared';
import {
  evaluateHaushalt,
  validiereAnrechnungsRules,
  validierePrecedenceRules,
  ANRECHNUNGS_RULES,
  PRECEDENCE_RULES,
} from './orchestrator.js';
import { ladeKonstanten } from './constants/index.js';
import { fakeReferenzdaten } from './ports/referenzdaten.js';

const konstanten = ladeKonstanten('2026-01');
const referenz = fakeReferenzdaten([]);

function haushaltMitKind() {
  const eingabe = HaushaltEingabeSchema.parse({
    id: 'h1',
    erstelltAm: '2026-09-09',
    pruefungsStichtag: '2026-09-09',
    rechtsstandVersion: '2026-01',
    mitglieder: [
      {
        id: 'erw',
        geburtsdatum: '1992-04-01',
        istHauptantragsteller: true,
        istPartnerDesHauptantragstellers: false,
        istKind: false,
        erwerbsstatusPrimaer: 'elternzeit',
        isEmployed: false,
        isSelfEmployed: false,
        isStudent: false,
        isRetired: false,
        isUnemployed: false,
        hasDisability: false,
        einkommen: {
          bruttoMonatlichCent: 0,
          nettoMonatlichCent: 0,
          arten: {
            erwerbstaetigkeitCent: 0,
            renteCent: 0,
            kapitalertraegeCent: 0,
            sonstigeCent: 0,
          },
        },
        vermoegenCent: 0,
      },
      {
        id: 'kind',
        geburtsdatum: '2026-01-10',
        istHauptantragsteller: false,
        istPartnerDesHauptantragstellers: false,
        istKind: true,
        erwerbsstatusPrimaer: 'sonstiges',
        isEmployed: false,
        isSelfEmployed: false,
        isStudent: false,
        isRetired: false,
        isUnemployed: false,
        hasDisability: false,
        einkommen: {
          bruttoMonatlichCent: 0,
          nettoMonatlichCent: 0,
          arten: {
            erwerbstaetigkeitCent: 0,
            renteCent: 0,
            kapitalertraegeCent: 0,
            sonstigeCent: 0,
          },
        },
        vermoegenCent: 0,
        kindergeldWirdBezogen: true,
      },
    ],
    wohnsituation: {
      plz: '10115',
      wohnort: 'Berlin',
      bundesland: 'BE',
      wohnverhaeltnis: 'miete',
      kaltmieteCent: 700,
      nebenkostenCent: 150,
      heizkostenCent: 80,
      wohnflaecheQm: 55,
    },
  });
  return ergaenzeHaushalt(eingabe);
}

describe('Orchestrator', () => {
  it('validierePrecedenceRules akzeptiert die Spec-Tabelle', () => {
    expect(() => validierePrecedenceRules(PRECEDENCE_RULES)).not.toThrow();
  });

  it('validierePrecedenceRules schlaegt bei einer zyklischen Testregel fehl', () => {
    expect(() =>
      validierePrecedenceRules([
        {
          id: 'a',
          beschreibung: '',
          wennBerechtigt: 'wohngeld',
          dannNachrangig: 'buergergeld',
          begruendungFuerNutzer: '',
        },
        {
          id: 'b',
          beschreibung: '',
          wennBerechtigt: 'buergergeld',
          dannNachrangig: 'wohngeld',
          begruendungFuerNutzer: '',
        },
      ]),
    ).toThrow();
  });

  it('validiereAnrechnungsRules akzeptiert den azyklischen Graphen', () => {
    expect(() => validiereAnrechnungsRules(ANRECHNUNGS_RULES)).not.toThrow();
  });

  it('validiereAnrechnungsRules schlaegt bei einer zyklischen Testregel fehl', () => {
    expect(() =>
      validiereAnrechnungsRules([
        { id: 'a', quelle: 'wohngeld', ziel: 'kinderzuschlag', anteil: 1, beschreibung: '' },
        { id: 'b', quelle: 'kinderzuschlag', ziel: 'wohngeld', anteil: 1, beschreibung: '' },
      ]),
    ).toThrow();
  });

  it('rechnet die Systemgruppe, auch wenn nur Elterngeld ausgewaehlt ist', () => {
    const result = evaluateHaushalt(
      haushaltMitKind(),
      ['elterngeld'],
      {
        elterngeld: {
          geburtsdatumKind: '2026-01-10',
          nettoeinkommenVorGeburtMonatlichCent: 2000,
          zuVersteuerndesEinkommenVorjahrCent: 30000,
          wochenstundenWaehrendBezug: 0,
          gewaehlteVariante: 'basis',
        },
      },
      konstanten,
      referenz,
    );
    expect(result.elterngeld?.eligible).toBe('ja');
    expect(result.elterngeld?.geschaetzterBetragCent).toBe(130000);
    const keys = Object.keys(result) as SystemKey[];
    expect(keys).toEqual(['elterngeld']);
  });

  it('Elterngeld mit berechnungsart lohnersatz wird von der Vermeidungspruefung nicht angefasst', () => {
    const result = evaluateHaushalt(
      haushaltMitKind(),
      ['elterngeld', 'buergergeld'],
      {
        elterngeld: {
          geburtsdatumKind: '2026-01-10',
          nettoeinkommenVorGeburtMonatlichCent: 2000,
          zuVersteuerndesEinkommenVorjahrCent: 30000,
          wochenstundenWaehrendBezug: 0,
          gewaehlteVariante: 'basis',
        },
      },
      konstanten,
      referenz,
    );
    expect(result.elterngeld?.eligible).toBe('ja');
    expect(result.buergergeld?.eligible).toBe('nicht_pruefbar');
  });
});
