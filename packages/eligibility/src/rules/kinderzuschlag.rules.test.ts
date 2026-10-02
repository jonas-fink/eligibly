import { describe, expect, it } from 'vitest';
import { HaushaltEingabeSchema, ergaenzeHaushalt, type Haushaltsmitglied } from '@eligibility/shared';
import { ladeKonstanten } from '../constants/index.js';
import { fakeReferenzdaten } from '../ports/referenzdaten.js';
import { evaluateHaushalt } from '../orchestrator.js';
import { erwerbstaetigenfreibetragCent, vermoegensfreibetragCent } from './sgb2.js';
import { kinderzuschlagRegel } from './kinderzuschlag.rules.js';

const konstanten = ladeKonstanten('2026-01');
const referenz = fakeReferenzdaten([]);
const STICHTAG = '2026-06-01';

function einkommen(bruttoEuro: number, nettoEuro = bruttoEuro, erwerbEuro = bruttoEuro) {
  return {
    bruttoMonatlichCent: bruttoEuro,
    nettoMonatlichCent: nettoEuro,
    arten: {
      erwerbstaetigkeitCent: erwerbEuro,
      renteCent: bruttoEuro - erwerbEuro,
      kapitalertraegeCent: 0,
      sonstigeCent: 0,
    },
  };
}

function person(opts: Partial<Haushaltsmitglied> & Pick<Haushaltsmitglied, 'id' | 'geburtsdatum'>): Haushaltsmitglied {
  return {
    istHauptantragsteller: false,
    istPartnerDesHauptantragstellers: false,
    istKind: false,
    erwerbsstatusPrimaer: 'angestellt',
    isEmployed: true,
    isSelfEmployed: false,
    isStudent: false,
    isRetired: false,
    isUnemployed: false,
    hasDisability: false,
    einkommen: einkommen(0),
    vermoegenCent: 0,
    ...opts,
  };
}

function haushalt(mitglieder: Haushaltsmitglied[], vermoegenEuro = 0) {
  const mit = mitglieder.map((m, i) =>
    i === 0 ? { ...m, vermoegenCent: vermoegenEuro } : m,
  );
  return ergaenzeHaushalt(
    HaushaltEingabeSchema.parse({
      id: 'h',
      erstelltAm: STICHTAG,
      pruefungsStichtag: STICHTAG,
      rechtsstandVersion: '2026-01',
      mitglieder: mit,
      wohnsituation: {
        plz: '10115',
        wohnort: 'Berlin',
        bundesland: 'BE',
        wohnverhaeltnis: 'miete',
        kaltmieteCent: 700,
        nebenkostenCent: 100,
        heizkostenCent: 80,
        wohnflaecheQm: 60,
      },
    }),
  );
}

function alleinerziehend(bruttoEuro: number, kindExtra: Partial<Haushaltsmitglied> = {}) {
  return haushalt([
    person({
      id: 'haupt',
      geburtsdatum: '1991-01-01',
      istHauptantragsteller: true,
      einkommen: einkommen(bruttoEuro),
    }),
    person({
      id: 'kind',
      geburtsdatum: '2022-01-15',
      istKind: true,
      erwerbsstatusPrimaer: 'sonstiges',
      isEmployed: false,
      kindergeldWirdBezogen: true,
      einkommen: einkommen(0),
      ...kindExtra,
    }),
  ]);
}

function rechne(
  h: ReturnType<typeof haushalt>,
  extra: Parameters<typeof kinderzuschlagRegel.calculate>[0] = {},
) {
  return kinderzuschlagRegel.calculate(
    { haushalt: h, ...extra },
    konstanten,
    referenz,
  );
}

describe('SGB II Freibeträge', () => {
  it('staffelt den Erwerbstätigenfreibetrag', () => {
    expect(erwerbstaetigenfreibetragCent(0, true)).toBe(0);
    expect(erwerbstaetigenfreibetragCent(10_000, true)).toBe(10_000);
    expect(erwerbstaetigenfreibetragCent(52_000, false)).toBe(18_400);
    expect(erwerbstaetigenfreibetragCent(100_000, false)).toBe(32_800);
    expect(erwerbstaetigenfreibetragCent(120_000, false)).toBe(34_800);
    expect(erwerbstaetigenfreibetragCent(150_000, true)).toBe(37_800);
    expect(erwerbstaetigenfreibetragCent(200_000, true)).toBe(37_800);
  });

  it('staffelt das Vermögen nach Alter', () => {
    expect(vermoegensfreibetragCent(29)).toBe(500_000);
    expect(vermoegensfreibetragCent(30)).toBe(1_000_000);
    expect(vermoegensfreibetragCent(40)).toBe(1_000_000);
    expect(vermoegensfreibetragCent(41)).toBe(1_250_000);
    expect(vermoegensfreibetragCent(51)).toBe(2_000_000);
  });
});

describe('Kinderzuschlag', () => {
  it('zahlt den Höchstbetrag, wenn das Elterneinkommen den Bedarf nicht übersteigt', () => {
    const calc = rechne(alleinerziehend(600));
    expect(calc.voraussetzungenErfuellt).toBe(true);
    expect(calc.betragCent).toBe(29_700);
    expect(calc.teilbetraege).toEqual([{ personId: 'kind', betragCent: 29_700, hinweis: 'Kinderzuschlag' }]);
  });

  it('verlangt 600 € brutto bei Alleinerziehenden', () => {
    expect(rechne(alleinerziehend(599)).betragCent).toBe(0);
    expect(rechne(alleinerziehend(599)).voraussetzungenErfuellt).toBe(false);
  });

  it('verlangt 900 € brutto bei Paaren', () => {
    const h = haushalt([
      person({
        id: 'haupt',
        geburtsdatum: '1990-01-01',
        istHauptantragsteller: true,
        einkommen: einkommen(800),
      }),
      person({
        id: 'partner',
        geburtsdatum: '1992-01-01',
        istPartnerDesHauptantragstellers: true,
        einkommen: einkommen(0),
      }),
      person({
        id: 'kind',
        geburtsdatum: '2018-04-01',
        istKind: true,
        erwerbsstatusPrimaer: 'sonstiges',
        isEmployed: false,
        kindergeldWirdBezogen: true,
        einkommen: einkommen(0),
      }),
    ]);
    expect(rechne(h).betragCent).toBe(0);
  });

  it('rechnet 45 % des Kindeseinkommens an', () => {
    const h = alleinerziehend(600, { einkommen: einkommen(100) });
    expect(rechne(h).betragCent).toBe(29_700 - 4_500);
  });

  it('rechnet Unterhaltsvorschuss zu 45 % an, einmal je Kind', () => {
    const calc = rechne(alleinerziehend(600), {
      zusaetzlichesEinkommenCent: { unterhaltsvorschuss: 22_700 },
    });
    expect(calc.betragCent).toBe(29_700 - 10_215);
  });

  it('zieht die Abschmelzung einmal von der Summe ab', () => {
    const h = haushalt([
      person({
        id: 'haupt',
        geburtsdatum: '1991-01-01',
        istHauptantragsteller: true,
        einkommen: einkommen(2500, 2200),
      }),
      person({
        id: 'k1',
        geburtsdatum: '2018-01-01',
        istKind: true,
        erwerbsstatusPrimaer: 'sonstiges',
        isEmployed: false,
        kindergeldWirdBezogen: true,
        einkommen: einkommen(0),
      }),
      person({
        id: 'k2',
        geburtsdatum: '2020-01-01',
        istKind: true,
        erwerbsstatusPrimaer: 'sonstiges',
        isEmployed: false,
        kindergeldWirdBezogen: true,
        einkommen: einkommen(0),
      }),
    ]);
    const calc = rechne(h);
    expect(calc.betragCent).toBeGreaterThan(0);
    expect(calc.betragCent).toBeLessThan(29_700 * 2);
    const summe = calc.teilbetraege?.reduce((s, t) => s + t.betragCent, 0);
    expect(summe).toBe(calc.betragCent);
    expect(calc.teilbetraege).toHaveLength(2);
  });

  it('gibt ohne Kindergeld keinen Anspruch', () => {
    const h = alleinerziehend(600, { kindergeldWirdBezogen: false });
    const calc = rechne(h);
    expect(calc.betragCent).toBe(0);
    expect(calc.datenluecken).toEqual([]);
  });

  it('nennt fehlenden Kindergeldbezug als Datenlücke', () => {
    const h = alleinerziehend(600, { kindergeldWirdBezogen: undefined });
    expect(rechne(h).datenluecken).toEqual(['Kindergeldbezug nicht angegeben']);
  });

  it('lehnt erhebliches Vermögen ab', () => {
    const h = haushalt(
      [
        person({
          id: 'haupt',
          geburtsdatum: '1991-01-01',
          istHauptantragsteller: true,
          einkommen: einkommen(600),
        }),
        person({
          id: 'kind',
          geburtsdatum: '2022-01-15',
          istKind: true,
          erwerbsstatusPrimaer: 'sonstiges',
          isEmployed: false,
          kindergeldWirdBezogen: true,
          einkommen: einkommen(0),
        }),
      ],
      20_000,
    );
    expect(rechne(h).betragCent).toBe(0);
  });

  it('Orchestrator reicht den Unterhaltsvorschuss durch', () => {
    const result = evaluateHaushalt(
      alleinerziehend(600),
      ['kinderzuschlag', 'unterhaltsvorschuss'],
      {
        unterhaltsvorschuss: {
          andererElternteilZahltKeinenOderUnzureichendenUnterhalt: true,
        },
      },
      konstanten,
      referenz,
    );
    expect(result.unterhaltsvorschuss?.geschaetzterBetragCent).toBe(22_700);
    expect(result.kinderzuschlag?.eligible).toBe('ja');
    expect(result.kinderzuschlag?.geschaetzterBetragCent).toBe(29_700 - 10_215);
    expect(result.kinderzuschlag?.naechsteSchritte.zustaendigeStelle).toMatch(/Familienkasse/);
  });
});
