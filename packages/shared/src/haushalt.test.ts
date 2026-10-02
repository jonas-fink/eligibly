import { describe, expect, it } from 'vitest';
import { HaushaltEingabeSchema, ergaenzeHaushalt } from './haushalt.js';

const basisMitglied = {
  id: 'p1',
  geburtsdatum: '1990-01-15',
  istHauptantragsteller: true,
  istPartnerDesHauptantragstellers: false,
  istKind: false,
  erwerbsstatusPrimaer: 'angestellt' as const,
  isEmployed: true,
  isSelfEmployed: false,
  isStudent: false,
  isRetired: false,
  isUnemployed: false,
  hasDisability: false,
  einkommen: {
    bruttoMonatlichCent: 2000,
    nettoMonatlichCent: 1500,
    arten: {
      erwerbstaetigkeitCent: 2000,
      renteCent: 0,
      kapitalertraegeCent: 0,
      sonstigeCent: 0,
    },
  },
  vermoegenCent: 0,
};

const basisHaushalt = {
  id: 'h1',
  erstelltAm: '2026-09-09',
  pruefungsStichtag: '2026-09-09',
  rechtsstandVersion: '2026-01',
  mitglieder: [basisMitglied],
  wohnsituation: {
    plz: '10115',
    wohnort: 'Berlin',
    bundesland: 'BE' as const,
    wohnverhaeltnis: 'miete' as const,
    kaltmieteCent: 600,
    nebenkostenCent: 100,
    heizkostenCent: 80,
    wohnflaecheQm: 45,
  },
};

describe('HaushaltEingabeSchema', () => {
  it('nimmt Euro entgegen und speichert Cent', () => {
    const parsed = HaushaltEingabeSchema.parse(basisHaushalt);
    expect(parsed.wohnsituation.kaltmieteCent).toBe(60000);
  });

  it('lehnt unvollstaendige PLZ ab', () => {
    const result = HaushaltEingabeSchema.safeParse({
      ...basisHaushalt,
      wohnsituation: { ...basisHaushalt.wohnsituation, plz: '123' },
    });
    expect(result.success).toBe(false);
  });
});

describe('ergaenzeHaushalt', () => {
  it('leitet alleinstehend und Warmmiete ab', () => {
    const h = ergaenzeHaushalt(HaushaltEingabeSchema.parse(basisHaushalt));
    expect(h.haushaltstyp).toBe('alleinstehend');
    expect(h.warmmieteCent).toBe(78000);
    expect(h.anzahlPersonen).toBe(1);
  });
});
