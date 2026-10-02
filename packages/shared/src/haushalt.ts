import { z } from 'zod';
import { BundeslandSchema, ErwerbsstatusPrimaerSchema } from './system.js';
import { EuroNachCentSchema } from './geld.js';

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

export const KalendertagSchema = z
  .string()
  .regex(ISO_DATUM, 'ISO-8601 Kalendertag erwartet')
  .refine((wert) => {
    const d = new Date(`${wert}T00:00:00+01:00`);
    return !Number.isNaN(d.getTime());
  }, 'Ungueltiges Datum');

function alterAm(geburtsdatum: string, stichtag: string): number {
  const [gj, gm, gt] = geburtsdatum.split('-').map(Number) as [number, number, number];
  const [sj, sm, st] = stichtag.split('-').map(Number) as [number, number, number];
  let alter = sj - gj;
  if (sm < gm || (sm === gm && st < gt)) alter -= 1;
  return alter;
}

export const EinkommenSchema = z
  .object({
    bruttoMonatlichCent: EuroNachCentSchema,
    nettoMonatlichCent: EuroNachCentSchema,
    arten: z.object({
      erwerbstaetigkeitCent: EuroNachCentSchema,
      renteCent: EuroNachCentSchema,
      kapitalertraegeCent: EuroNachCentSchema,
      sonstigeCent: EuroNachCentSchema,
    }),
  })
  .superRefine((wert, ctx) => {
    const summe =
      wert.arten.erwerbstaetigkeitCent +
      wert.arten.renteCent +
      wert.arten.kapitalertraegeCent +
      wert.arten.sonstigeCent;
    if (Math.abs(summe - wert.bruttoMonatlichCent) > 100) {
      ctx.addIssue({
        code: 'custom',
        message: 'Summe der Einkunftsarten muss dem Brutto entsprechen (Toleranz 1 Euro)',
        path: ['arten'],
      });
    }
    if (wert.nettoMonatlichCent > wert.bruttoMonatlichCent) {
      ctx.addIssue({
        code: 'custom',
        message: 'Netto darf Brutto nicht uebersteigen',
        path: ['nettoMonatlichCent'],
      });
    }
  });

export type Einkommen = z.infer<typeof EinkommenSchema>;

export const HaushaltsmitgliedSchema = z
  .object({
    id: z.string().min(1),
    geburtsdatum: KalendertagSchema,
    istHauptantragsteller: z.boolean(),
    istPartnerDesHauptantragstellers: z.boolean(),
    istKind: z.boolean(),
    erwerbsstatusPrimaer: ErwerbsstatusPrimaerSchema,
    isEmployed: z.boolean(),
    isSelfEmployed: z.boolean(),
    isStudent: z.boolean(),
    isRetired: z.boolean(),
    isUnemployed: z.boolean(),
    hasDisability: z.boolean(),
    einkommen: EinkommenSchema,
    vermoegenCent: EuroNachCentSchema,
    unterhaltErhaltenCent: EuroNachCentSchema.optional(),
    unterhaltGezahltCent: EuroNachCentSchema.optional(),
    kindergeldWirdBezogen: z.boolean().optional(),
  })
  .superRefine((m, ctx) => {
    const rollen = [m.istHauptantragsteller, m.istPartnerDesHauptantragstellers, m.istKind].filter(
      Boolean,
    ).length;
    if (rollen !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Genau eine Rolle: Hauptantragsteller, Partner oder Kind',
      });
    }
    if (m.erwerbsstatusPrimaer === 'rente' && !m.isRetired) {
      ctx.addIssue({
        code: 'custom',
        message: 'Primaerzuordnung rente verlangt isRetired',
        path: ['isRetired'],
      });
    }
    if (m.erwerbsstatusPrimaer === 'angestellt' && !m.isEmployed) {
      ctx.addIssue({
        code: 'custom',
        message: 'Primaerzuordnung angestellt verlangt isEmployed',
        path: ['isEmployed'],
      });
    }
    if (m.erwerbsstatusPrimaer === 'selbststaendig' && !m.isSelfEmployed) {
      ctx.addIssue({
        code: 'custom',
        message: 'Primaerzuordnung selbststaendig verlangt isSelfEmployed',
        path: ['isSelfEmployed'],
      });
    }
    if (m.erwerbsstatusPrimaer === 'arbeitslos' && !m.isUnemployed) {
      ctx.addIssue({
        code: 'custom',
        message: 'Primaerzuordnung arbeitslos verlangt isUnemployed',
        path: ['isUnemployed'],
      });
    }
    if (m.erwerbsstatusPrimaer === 'studium' && !m.isStudent) {
      ctx.addIssue({
        code: 'custom',
        message: 'Primaerzuordnung studium verlangt isStudent',
        path: ['isStudent'],
      });
    }
  });

export type Haushaltsmitglied = z.infer<typeof HaushaltsmitgliedSchema>;

export const HAUSHALTSTYPEN = [
  'alleinstehend',
  'alleinerziehend',
  'paarOhneKinder',
  'paarMitKindern',
] as const;

export const HaushaltstypSchema = z.enum(HAUSHALTSTYPEN);
export type Haushaltstyp = z.infer<typeof HaushaltstypSchema>;

export const WohnsituationSchema = z.object({
  plz: z.string().regex(/^\d{5}$/, '5 Ziffern erwartet'),
  wohnort: z.string().min(1),
  bundesland: BundeslandSchema,
  wohnverhaeltnis: z.enum(['miete', 'eigentum']),
  kaltmieteCent: EuroNachCentSchema,
  nebenkostenCent: EuroNachCentSchema,
  heizkostenCent: EuroNachCentSchema,
  wohnflaecheQm: z.number().positive(),
});

export type Wohnsituation = z.infer<typeof WohnsituationSchema>;

export const HaushaltEingabeSchema = z
  .object({
    id: z.string().min(1),
    erstelltAm: KalendertagSchema,
    pruefungsStichtag: KalendertagSchema,
    rechtsstandVersion: z.string().min(1),
    mitglieder: z.array(HaushaltsmitgliedSchema).min(1),
    wohnsituation: WohnsituationSchema,
  })
  .superRefine((h, ctx) => {
    const haupt = h.mitglieder.filter((m) => m.istHauptantragsteller);
    if (haupt.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Genau ein Hauptantragsteller',
        path: ['mitglieder'],
      });
    }
    const partner = h.mitglieder.filter((m) => m.istPartnerDesHauptantragstellers);
    if (partner.length > 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Hoechstens ein Partner',
        path: ['mitglieder'],
      });
    }
    for (const m of h.mitglieder) {
      if (m.geburtsdatum > h.pruefungsStichtag) {
        ctx.addIssue({
          code: 'custom',
          message: 'Geburtsdatum nicht in der Zukunft',
          path: ['mitglieder'],
        });
      }
      if (m.geburtsdatum < '1900-01-01') {
        ctx.addIssue({
          code: 'custom',
          message: 'Geburtsdatum nicht vor 1900',
          path: ['mitglieder'],
        });
      }
    }
  });

export type HaushaltEingabe = z.infer<typeof HaushaltEingabeSchema>;

export type Haushalt = HaushaltEingabe & {
  anzahlPersonen: number;
  anzahlKinder: number;
  haushaltstyp: Haushaltstyp;
  warmmieteCent: number;
  vermoegenGesamtCent: number;
  gesamtEinkommenBruttoMonatlichCent: number;
  gesamtEinkommenNettoMonatlichCent: number;
};

export function ermittleHaushaltstyp(mitglieder: Haushaltsmitglied[]): Haushaltstyp {
  const erwachsene = mitglieder.filter((m) => !m.istKind);
  const kinder = mitglieder.filter((m) => m.istKind);
  const hatPartner = mitglieder.some((m) => m.istPartnerDesHauptantragstellers);
  if (erwachsene.length === 1 && kinder.length === 0) return 'alleinstehend';
  if (erwachsene.length === 1 && kinder.length >= 1) return 'alleinerziehend';
  if (hatPartner && kinder.length === 0) return 'paarOhneKinder';
  return 'paarMitKindern';
}

export function ergaenzeHaushalt(eingabe: HaushaltEingabe): Haushalt {
  const kinder = eingabe.mitglieder.filter((m) => m.istKind);
  return {
    ...eingabe,
    anzahlPersonen: eingabe.mitglieder.length,
    anzahlKinder: kinder.length,
    haushaltstyp: ermittleHaushaltstyp(eingabe.mitglieder),
    warmmieteCent:
      eingabe.wohnsituation.kaltmieteCent +
      eingabe.wohnsituation.nebenkostenCent +
      eingabe.wohnsituation.heizkostenCent,
    vermoegenGesamtCent: eingabe.mitglieder.reduce((s, m) => s + m.vermoegenCent, 0),
    gesamtEinkommenBruttoMonatlichCent: eingabe.mitglieder.reduce(
      (s, m) => s + m.einkommen.bruttoMonatlichCent,
      0,
    ),
    gesamtEinkommenNettoMonatlichCent: eingabe.mitglieder.reduce(
      (s, m) => s + m.einkommen.nettoMonatlichCent,
      0,
    ),
  };
}

export { alterAm };
