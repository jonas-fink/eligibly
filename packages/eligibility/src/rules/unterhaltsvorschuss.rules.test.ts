import { describe, expect, it } from 'vitest';
import { HaushaltEingabeSchema, ergaenzeHaushalt } from '@eligibility/shared';
import { ladeKonstanten } from '../constants/index.js';
import { fakeReferenzdaten } from '../ports/referenzdaten.js';
import { evaluateHaushalt } from '../orchestrator.js';
import { unterhaltsvorschussRegel } from './unterhaltsvorschuss.rules.js';

const konstanten = ladeKonstanten('2026-01');
const referenz = fakeReferenzdaten([]);
const STICHTAG = '2026-06-01';

const answersJa = {
  unterhaltsvorschuss: {
    andererElternteilZahltKeinenOderUnzureichendenUnterhalt: true,
  },
};

function haushalt(opts: {
  kinder: { id: string; geburtsdatum: string }[];
  bruttoEuro?: number;
  mitPartner?: boolean;
}) {
  const brutto = opts.bruttoEuro ?? 0;
  const erw = {
    erwerbsstatusPrimaer: 'angestellt' as const,
    isEmployed: true,
    isSelfEmployed: false,
    isStudent: false,
    isRetired: false,
    isUnemployed: false,
    hasDisability: false,
    vermoegenCent: 0,
  };
  const mitglieder = [
    {
      id: 'haupt',
      geburtsdatum: '1990-03-01',
      istHauptantragsteller: true,
      istPartnerDesHauptantragstellers: false,
      istKind: false,
      ...erw,
      einkommen: einkommen(brutto),
    },
    ...(opts.mitPartner
      ? [
          {
            id: 'partner',
            geburtsdatum: '1991-03-01',
            istHauptantragsteller: false,
            istPartnerDesHauptantragstellers: true,
            istKind: false,
            ...erw,
            einkommen: einkommen(0),
          },
        ]
      : []),
    ...opts.kinder.map((kind) => ({
      id: kind.id,
      geburtsdatum: kind.geburtsdatum,
      istHauptantragsteller: false,
      istPartnerDesHauptantragstellers: false,
      istKind: true,
      erwerbsstatusPrimaer: 'sonstiges' as const,
      isEmployed: false,
      isSelfEmployed: false,
      isStudent: false,
      isRetired: false,
      isUnemployed: false,
      hasDisability: false,
      vermoegenCent: 0,
      einkommen: einkommen(0),
      kindergeldWirdBezogen: true,
    })),
  ];

  return ergaenzeHaushalt(
    HaushaltEingabeSchema.parse({
      id: 'h',
      erstelltAm: STICHTAG,
      pruefungsStichtag: STICHTAG,
      rechtsstandVersion: '2026-01',
      mitglieder,
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

function einkommen(bruttoEuro: number) {
  return {
    bruttoMonatlichCent: bruttoEuro,
    nettoMonatlichCent: bruttoEuro,
    arten: {
      erwerbstaetigkeitCent: bruttoEuro,
      renteCent: 0,
      kapitalertraegeCent: 0,
      sonstigeCent: 0,
    },
  };
}

function rechne(
  h: ReturnType<typeof haushalt>,
  answers: Record<string, unknown> | undefined = answersJa,
) {
  return unterhaltsvorschussRegel.calculate(
    { haushalt: h, systemSpecificAnswers: answers },
    konstanten,
    referenz,
  );
}

describe('Unterhaltsvorschuss 2026', () => {
  it('Kind 0–5: 486 − 259 = 227 €', () => {
    const calc = rechne(haushalt({ kinder: [{ id: 'k', geburtsdatum: '2022-01-15' }] }));
    expect(konstanten.KINDERGELD_MONATLICH_CENT).toBe(25_900);
    expect(calc.voraussetzungenErfuellt).toBe(true);
    expect(calc.betragCent).toBe(22_700);
    expect(calc.teilbetraege).toEqual([
      { personId: 'k', betragCent: 22_700, hinweis: 'Altersgruppe 0 bis 5 Jahre' },
    ]);
  });

  it('Kind 6–11: 299 €', () => {
    const calc = rechne(haushalt({ kinder: [{ id: 'k', geburtsdatum: '2018-01-15' }] }));
    expect(calc.betragCent).toBe(29_900);
    expect(calc.teilbetraege?.[0]?.hinweis).toBe('Altersgruppe 6 bis 11 Jahre');
  });

  it('wechselt die Stufe am Geburtstag', () => {
    const amTag = rechne(haushalt({ kinder: [{ id: 'k', geburtsdatum: '2020-06-01' }] }));
    const davor = rechne(haushalt({ kinder: [{ id: 'k', geburtsdatum: '2020-06-02' }] }));
    expect(amTag.betragCent).toBe(29_900);
    expect(davor.betragCent).toBe(22_700);
  });

  it('Kind 12–17 nur ab 600 € Brutto des betreuenden Elternteils', () => {
    const kind = { id: 'k', geburtsdatum: '2012-01-15' };
    const mitEinkommen = rechne(haushalt({ kinder: [kind], bruttoEuro: 600 }));
    const knappDarunter = rechne(haushalt({ kinder: [kind], bruttoEuro: 599 }));
    expect(mitEinkommen.betragCent).toBe(39_400);
    expect(mitEinkommen.hinweise?.[0]).toMatch(/Ab 12 Jahren/);
    expect(knappDarunter.betragCent).toBe(0);
    expect(knappDarunter.voraussetzungenErfuellt).toBe(false);
    expect(knappDarunter.hinweise?.[0]).toMatch(/Jugendamt/);
  });

  it('ab dem 18. Geburtstag kein Anspruch', () => {
    const calc = rechne(haushalt({ kinder: [{ id: 'k', geburtsdatum: '2008-06-01' }] }));
    expect(calc.betragCent).toBe(0);
    expect(calc.voraussetzungenErfuellt).toBe(false);
    expect(calc.datenluecken).toEqual([]);
  });

  it('summiert Teilbeträge je Kind', () => {
    const calc = rechne(
      haushalt({
        kinder: [
          { id: 'jung', geburtsdatum: '2023-04-01' },
          { id: 'schule', geburtsdatum: '2016-04-01' },
        ],
      }),
    );
    expect(calc.betragCent).toBe(22_700 + 29_900);
    expect(calc.teilbetraege).toHaveLength(2);
  });

  it('unbekannter oder verstorbener Elternteil reicht', () => {
    const calc = rechne(
      haushalt({ kinder: [{ id: 'k', geburtsdatum: '2022-01-15' }] }),
      {
        unterhaltsvorschuss: {
          andererElternteilZahltKeinenOderUnzureichendenUnterhalt: false,
          andererElternteilIstUnbekanntOderVerstorben: true,
        },
      },
    );
    expect(calc.betragCent).toBe(22_700);
  });

  it('ohne die Voraussetzung zum anderen Elternteil: nein', () => {
    const calc = rechne(haushalt({ kinder: [{ id: 'k', geburtsdatum: '2022-01-15' }] }), {
      unterhaltsvorschuss: {
        andererElternteilZahltKeinenOderUnzureichendenUnterhalt: false,
      },
    });
    expect(calc.betragCent).toBe(0);
    expect(calc.datenluecken).toEqual([]);
  });

  it('Paar mit Kind ist nicht alleinerziehend', () => {
    const calc = rechne(
      haushalt({ kinder: [{ id: 'k', geburtsdatum: '2022-01-15' }], mitPartner: true }),
    );
    expect(calc.voraussetzungenErfuellt).toBe(false);
    expect(calc.betragCent).toBe(0);
  });

  it('fehlende Angaben bei Alleinerziehenden sind eine Datenlücke', () => {
    const calc = rechne(haushalt({ kinder: [{ id: 'k', geburtsdatum: '2022-01-15' }] }), {});
    expect(calc.datenluecken).toEqual(['Angaben zum Unterhaltsvorschuss unvollständig']);
    expect(calc.betragCent).toBe(0);
  });

  it('Orchestrator liefert den Zahlbetrag und rechnet die Gruppe mit', () => {
    const result = evaluateHaushalt(
      haushalt({ kinder: [{ id: 'k', geburtsdatum: '2022-01-15' }] }),
      ['unterhaltsvorschuss'],
      answersJa,
      konstanten,
      referenz,
    );
    expect(result.unterhaltsvorschuss?.eligible).toBe('ja');
    expect(result.unterhaltsvorschuss?.geschaetzterBetragCent).toBe(22_700);
    expect(result.unterhaltsvorschuss?.teilbetraege?.[0]?.betragCent).toBe(22_700);
    expect(result.unterhaltsvorschuss?.naechsteSchritte.zustaendigeStelle).toMatch(/Jugendamt/);
    expect(result.wohngeld).toBeDefined();
  });
});
