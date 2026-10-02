import { z } from 'zod';

export const SYSTEM_KEYS = [
  'grundsicherung',
  'wohngeld',
  'kinderzuschlag',
  'buergergeld',
  'bafoeg',
  'elterngeld',
  'unterhaltsvorschuss',
  'wbs',
] as const;

export const SystemKeySchema = z.enum(SYSTEM_KEYS);
export type SystemKey = z.infer<typeof SystemKeySchema>;

export const SYSTEM_GRUPPEN = {
  existenzsicherung: [
    'grundsicherung',
    'buergergeld',
    'wohngeld',
    'kinderzuschlag',
    'unterhaltsvorschuss',
  ],
  ausbildungsfoerderung: ['bafoeg'],
  familienleistung: ['elterngeld'],
  wohnberechtigung: ['wbs'],
} as const satisfies Record<string, readonly SystemKey[]>;

export function expandiereZuSystemgruppen(auswahl: readonly SystemKey[]): SystemKey[] {
  const gruppen = Object.values(SYSTEM_GRUPPEN);
  const gesetzt = new Set<SystemKey>();
  for (const key of auswahl) {
    const gruppe = gruppen.find((g) => (g as readonly SystemKey[]).includes(key));
    if (gruppe) {
      for (const k of gruppe) gesetzt.add(k);
    } else {
      gesetzt.add(key);
    }
  }
  return [...gesetzt];
}

export const BUNDESLAENDER = [
  'BW',
  'BY',
  'BE',
  'BB',
  'HB',
  'HH',
  'HE',
  'MV',
  'NI',
  'NW',
  'RP',
  'SL',
  'SN',
  'ST',
  'SH',
  'TH',
] as const;

export const BundeslandSchema = z.enum(BUNDESLAENDER);
export type Bundesland = z.infer<typeof BundeslandSchema>;

export const ERWERBSSTATUS_PRIMAER = [
  'angestellt',
  'selbststaendig',
  'arbeitslos',
  'schulisch',
  'ausbildung',
  'studium',
  'rente',
  'elternzeit',
  'hausarbeitOderPflege',
  'sonstiges',
] as const;

export const ErwerbsstatusPrimaerSchema = z.enum(ERWERBSSTATUS_PRIMAER);
export type ErwerbsstatusPrimaer = z.infer<typeof ErwerbsstatusPrimaerSchema>;
