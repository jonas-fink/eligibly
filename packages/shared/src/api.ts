import { z } from 'zod';
import { HaushaltEingabeSchema } from './haushalt.js';
import { EligibilityResultSchema } from './ergebnis.js';
import { SystemKeySchema } from './system.js';
import { EuroNachCentSchema } from './geld.js';

export const ElterngeldAnswersSchema = z.object({
  geburtsdatumKind: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nettoeinkommenVorGeburtMonatlichCent: EuroNachCentSchema,
  zuVersteuerndesEinkommenVorjahrCent: EuroNachCentSchema,
  wochenstundenWaehrendBezug: z.number().nonnegative().max(80),
  gewaehlteVariante: z.enum(['basis', 'elterngeldPlus']),
});

export type ElterngeldAnswers = z.infer<typeof ElterngeldAnswersSchema>;

export const WohngeldAnswersSchema = z.object({
  gemeindeschluessel: z.string().min(1).optional(),
  mietstufe: z
    .union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(7),
    ])
    .optional(),
  schwerbehindertGdB100: z.array(z.string()).optional(),
  opferNsVerfolgung: z.array(z.string()).optional(),
  zinsenUndTilgungMonatlichCent: EuroNachCentSchema.optional(),
  grundsteuerJaehrlichCent: EuroNachCentSchema.optional(),
  verwaltungskostenAnDritteJaehrlichCent: EuroNachCentSchema.optional(),
  abzuegeKorrektur: z
    .record(
      z.string(),
      z.object({
        steuern: z.boolean(),
        kvPv: z.boolean(),
        rv: z.boolean(),
      }),
    )
    .optional(),
});

export type WohngeldAnswers = z.infer<typeof WohngeldAnswersSchema>;

export const UnterhaltsvorschussAnswersSchema = z.object({
  andererElternteilZahltKeinenOderUnzureichendenUnterhalt: z.boolean(),
  andererElternteilIstUnbekanntOderVerstorben: z.boolean().optional(),
});

export type UnterhaltsvorschussAnswers = z.infer<typeof UnterhaltsvorschussAnswersSchema>;

export const KinderzuschlagAnswersSchema = z.object({
  kindEinkommenMonatlichCent: EuroNachCentSchema.optional(),
});

export type KinderzuschlagAnswers = z.infer<typeof KinderzuschlagAnswersSchema>;

export const PruefungRequestSchema = z.object({
  haushalt: HaushaltEingabeSchema,
  interessierendeSysteme: z.array(SystemKeySchema).min(1),
  systemSpecificAnswers: z.record(z.string(), z.unknown()).optional(),
});

export type PruefungRequest = z.infer<typeof PruefungRequestSchema>;

export const PruefungResponseSchema = z.object({
  ergebnisse: z.array(EligibilityResultSchema),
  rechtsstandVersion: z.string(),
  rechtsstandAktuell: z.boolean(),
});

export type PruefungResponse = z.infer<typeof PruefungResponseSchema>;

export const RechtsstandInfoSchema = z.object({
  version: z.string(),
  gueltigVon: z.string(),
  gueltigBis: z.string(),
  aktuell: z.boolean(),
});

export const RechtsstaendeResponseSchema = z.object({
  staende: z.array(RechtsstandInfoSchema),
});

export type RechtsstaendeResponse = z.infer<typeof RechtsstaendeResponseSchema>;

export const GemeindeOptionSchema = z.object({
  ags: z.string(),
  name: z.string(),
  mietstufe: z.number().int().min(1).max(7).optional(),
});

export const GemeindenResponseSchema = z.object({
  plz: z.string(),
  gemeinden: z.array(GemeindeOptionSchema),
  mietstufeEindeutig: z.boolean(),
});

export type GemeindenResponse = z.infer<typeof GemeindenResponseSchema>;

export const EmailSchema = z
  .string()
  .trim()
  .max(254)
  .toLowerCase()
  .pipe(z.email({ error: 'E-Mail ungueltig' }));

export const PasswortSchema = z.string().min(12, 'Mindestens 12 Zeichen').max(200);

export const RegistrierungRequestSchema = z.object({
  email: EmailSchema,
  passwort: PasswortSchema,
});

export const AnmeldungRequestSchema = z.object({
  email: EmailSchema,
  passwort: z.string().min(1).max(200),
});

export const PasswortVergessenRequestSchema = z.object({
  email: EmailSchema,
});

export const EmailBestaetigenRequestSchema = z.object({
  token: z.string().min(20).max(200),
});

export const PasswortZuruecksetzenRequestSchema = z.object({
  token: z.string().min(20).max(200),
  passwort: PasswortSchema,
});

export const KontoAntwortSchema = z.object({
  email: z.string(),
  emailVerifiziert: z.boolean(),
});

export type KontoAntwort = z.infer<typeof KontoAntwortSchema>;

export const HaushaltSpeichernRequestSchema = z.object({
  einwilligung: z.literal(true, { error: 'Einwilligung fehlt' }),
  bezeichnung: z.string().trim().min(1).max(80).optional(),
  haushalt: HaushaltEingabeSchema,
  systemSpecificAnswers: z.record(z.string(), z.unknown()).optional(),
  ergebnisse: z.array(EligibilityResultSchema).optional(),
});

export type HaushaltSpeichernRequest = z.infer<typeof HaushaltSpeichernRequestSchema>;

export const HaushaltAktualisierenRequestSchema = HaushaltSpeichernRequestSchema.omit({
  einwilligung: true,
  ergebnisse: true,
});

export const HaushaltKurzSchema = z.object({
  id: z.string(),
  bezeichnung: z.string().optional(),
  erstelltAm: z.string(),
  aktualisiertAm: z.string(),
  plz: z.string(),
  wohnort: z.string(),
  anzahlPersonen: z.number().int(),
});

export const HaushaltListeSchema = z.object({
  haushalte: z.array(HaushaltKurzSchema),
});
