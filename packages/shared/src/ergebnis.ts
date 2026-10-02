import { z } from 'zod';
import { SystemKeySchema } from './system.js';

export const EligibilityStatusSchema = z.enum([
  'ja',
  'nein',
  'vielleicht',
  'nachrangig',
  'nicht_pruefbar',
]);
export type EligibilityStatus = z.infer<typeof EligibilityStatusSchema>;

export const BerechnungsartSchema = z.enum(['bedarfsdeckung', 'lohnersatz', 'berechtigung']);
export type Berechnungsart = z.infer<typeof BerechnungsartSchema>;

export const BetragsartSchema = z.enum(['zuschuss', 'zuschussUndDarlehen', 'keineGeldleistung']);
export type Betragsart = z.infer<typeof BetragsartSchema>;

export const GenauigkeitSchema = z.enum(['grob', 'detailliert']);
export type Genauigkeit = z.infer<typeof GenauigkeitSchema>;

export const NachrangigGrundSchema = z.enum(['ausschluss', 'vermeidung']);
export type NachrangigGrund = z.infer<typeof NachrangigGrundSchema>;

export const ModuleCalculationSchema = z.object({
  system: SystemKeySchema,
  berechnungsart: BerechnungsartSchema,
  voraussetzungenErfuellt: z.boolean(),
  betragCent: z.number().int(),
  bedarfCent: z.number().int().optional(),
  anrechenbaresEinkommenCent: z.number().int().optional(),
  bedarfslueckeCent: z.number().int().optional(),
  imGrenzbereich: z.boolean(),
  betragAufteilungCent: z
    .object({ zuschussCent: z.number().int(), darlehenCent: z.number().int() })
    .optional(),
  nachrangigDurch: z.array(SystemKeySchema).optional(),
  nachrangigGrund: NachrangigGrundSchema.optional(),
  vorrangUnklar: z.array(SystemKeySchema).optional(),
  datenluecken: z.array(z.string()),
  betrifftPersonId: z.string().optional(),
  hinweise: z.array(z.string()).optional(),
  teilbetraege: z
    .array(
      z.object({
        personId: z.string(),
        betragCent: z.number().int(),
        hinweis: z.string().optional(),
      }),
    )
    .optional(),
});

export type ModuleCalculation = z.infer<typeof ModuleCalculationSchema>;

export const EligibilityResultSchema = z.object({
  system: SystemKeySchema,
  eligible: EligibilityStatusSchema,
  ausgeschlossenDurch: z.array(SystemKeySchema).optional(),
  nachrangigGrund: NachrangigGrundSchema.optional(),
  vorrangUnklar: z.array(SystemKeySchema).optional(),
  geschaetzterBetragCent: z.number().int().optional(),
  betragSpanneCent: z.object({ vonCent: z.number().int(), bisCent: z.number().int() }).optional(),
  betragAufteilungCent: z
    .object({ zuschussCent: z.number().int(), darlehenCent: z.number().int() })
    .optional(),
  betragsart: BetragsartSchema,
  genauigkeit: GenauigkeitSchema,
  betrifftPersonId: z.string().optional(),
  teilbetraege: z
    .array(
      z.object({
        personId: z.string(),
        betragCent: z.number().int(),
        hinweis: z.string().optional(),
      }),
    )
    .optional(),
  datenlage: z.enum(['vollstaendig', 'unvollstaendig']),
  datenluecken: z.array(z.string()).optional(),
  begruendung: z.object({
    erfuellteKriterien: z.array(z.string()),
    nichtErfuellteKriterien: z.array(z.string()),
  }),
  naechsteSchritte: z.object({
    beschreibung: z.string(),
    benoetigteUnterlagen: z.array(z.string()),
    zustaendigeStelle: z.string(),
  }),
  rechtsstandVersion: z.string(),
});

export type EligibilityResult = z.infer<typeof EligibilityResultSchema>;
