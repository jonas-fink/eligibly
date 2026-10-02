import type { ErwerbsstatusPrimaer } from '@eligibility/shared';
import type { Mietstufe } from '../ports/referenzdaten.js';

/** Höchstbeträge Anlage 1 WoGG — Euro, 1–6 Personen × Mietstufe I–VII. */
export const ANLAGE_1_EURO: ReadonlyArray<ReadonlyArray<number>> = [
  [361, 408, 456, 511, 562, 615, 677],
  [437, 493, 551, 619, 680, 745, 820],
  [521, 587, 657, 737, 809, 887, 975],
  [608, 686, 766, 858, 946, 1035, 1139],
  [694, 782, 875, 982, 1080, 1183, 1302],
  [776, 876, 981, 1101, 1209, 1332, 1465],
];

/** Mehrbetrag je weiterer Person über 6, je Mietstufe. */
export const ANLAGE_1_MEHRBETRAG_EURO: ReadonlyArray<number> = [82, 94, 106, 119, 129, 149, 163];

export const HEIZ_BASIS_EURO = 110.4;
export const HEIZ_MEHR_EURO = 27.6;
export const KLIMA_BASIS_EURO = 19.2;
export const KLIMA_MEHR_EURO = 4.8;

export interface Anlage2Koeffizient {
  a: number;
  b: number;
  c: number;
}

/** Anlage 2 — Koeffizienten für 1–12 Mitglieder. */
export const ANLAGE_2: ReadonlyArray<Anlage2Koeffizient> = [
  { a: 0.04, b: 0.0004797, c: 0.0000408 },
  { a: 0.03, b: 0.0003571, c: 0.0000304 },
  { a: 0.02, b: 0.0002917, c: 0.0000245 },
  { a: 0.01, b: 0.0002163, c: 0.0000176 },
  { a: 0, b: 0.0001907, c: 0.0000172 },
  { a: -0.01, b: 0.0001722, c: 0.0000166 },
  { a: -0.02, b: 0.0001592, c: 0.0000165 },
  { a: -0.03, b: 0.0001583, c: 0.0000165 },
  { a: -0.04, b: 0.0001376, c: 0.0000166 },
  { a: -0.06, b: 0.0001249, c: 0.0000166 },
  { a: -0.09, b: 0.0001141, c: 0.0000196 },
  { a: -0.12, b: 0.0001107, c: 0.0000221 },
];

/** Anlage 3 — Mindestwerte M und Y in Euro für 1–12. */
export const ANLAGE_3_MINDEST_M_EURO: ReadonlyArray<number> = [
  54, 67, 79, 92, 103, 103, 115, 128, 140, 152, 187, 298,
];
export const ANLAGE_3_MINDEST_Y_EURO: ReadonlyArray<number> = [
  396, 679, 906, 1132, 1358, 1585, 1811, 2037, 2264, 2490, 2717, 2943,
];

export const BAGATELLGRENZE_EURO = 10;
export const ZUSCHLAG_UEBER_12_EURO = 65;
export const BEWIRTSCHAFTUNG_EURO_PRO_QM_JAHR = 36;

export const FREIBETRAG_SCHWERBEHINDERUNG_JAHR_EURO = 1800;
export const FREIBETRAG_NS_JAHR_EURO = 750;
export const FREIBETRAG_ALLEINERZIEHEND_JAHR_EURO = 1320;
export const FREIBETRAG_KIND_ERWERB_MAX_JAHR_EURO = 1200;

/** § 16 — pauschale Abzüge, abgeleitet aus Erwerbsstatus (Modul-Spec 8). */
export type AbzugSatz = { steuern: boolean; kvPv: boolean; rv: boolean };

export const ABZUEGE_NACH_ERWERB: Record<ErwerbsstatusPrimaer, AbzugSatz> = {
  angestellt: { steuern: true, kvPv: true, rv: true },
  selbststaendig: { steuern: true, kvPv: true, rv: false },
  arbeitslos: { steuern: false, kvPv: false, rv: false },
  schulisch: { steuern: false, kvPv: true, rv: false },
  ausbildung: { steuern: true, kvPv: true, rv: true },
  studium: { steuern: false, kvPv: true, rv: false },
  rente: { steuern: false, kvPv: true, rv: false },
  elternzeit: { steuern: false, kvPv: false, rv: false },
  hausarbeitOderPflege: { steuern: false, kvPv: false, rv: false },
  sonstiges: { steuern: false, kvPv: false, rv: false },
};

export function hoechstbetragEuro(n: number, mietstufe: Mietstufe): number {
  const msIdx = mietstufe - 1;
  if (n <= 6) {
    return (ANLAGE_1_EURO[n - 1]?.[msIdx] ?? 0) + heizEuro(n) + klimaEuro(n);
  }
  const basis = ANLAGE_1_EURO[5]?.[msIdx] ?? 0;
  const mehr = (ANLAGE_1_MEHRBETRAG_EURO[msIdx] ?? 0) * (n - 6);
  return basis + mehr + heizEuro(n) + klimaEuro(n);
}

export function heizEuro(n: number): number {
  if (n <= 1) return HEIZ_BASIS_EURO;
  // Spec 4.2: 2 Personen 142,60 €, danach +27,60 je weiterem
  return 142.6 + HEIZ_MEHR_EURO * (n - 2);
}

export function klimaEuro(n: number): number {
  if (n <= 1) return KLIMA_BASIS_EURO;
  // Spec 4.2: 2 Personen 24,80 €, danach +4,80 je weiterem
  return 24.8 + KLIMA_MEHR_EURO * (n - 2);
}

export function anlage2Fuer(n: number): Anlage2Koeffizient {
  const idx = Math.min(Math.max(n, 1), 12) - 1;
  return ANLAGE_2[idx]!;
}

export function mindestMEuro(n: number): number {
  const idx = Math.min(Math.max(n, 1), 12) - 1;
  return ANLAGE_3_MINDEST_M_EURO[idx]!;
}

export function mindestYEuro(n: number): number {
  const idx = Math.min(Math.max(n, 1), 12) - 1;
  return ANLAGE_3_MINDEST_Y_EURO[idx]!;
}

export interface WohngeldKonstanten {
  bagatellgrenzeEuro: number;
  zuschlagUeber12Euro: number;
  bewirtschaftungEuroProQmJahr: number;
  freibetraege: {
    schwerbehinderungJahrEuro: number;
    nsJahrEuro: number;
    alleinerziehendJahrEuro: number;
    kindErwerbMaxJahrEuro: number;
  };
}

export const wohngeldKonstanten202601: WohngeldKonstanten = {
  bagatellgrenzeEuro: BAGATELLGRENZE_EURO,
  zuschlagUeber12Euro: ZUSCHLAG_UEBER_12_EURO,
  bewirtschaftungEuroProQmJahr: BEWIRTSCHAFTUNG_EURO_PRO_QM_JAHR,
  freibetraege: {
    schwerbehinderungJahrEuro: FREIBETRAG_SCHWERBEHINDERUNG_JAHR_EURO,
    nsJahrEuro: FREIBETRAG_NS_JAHR_EURO,
    alleinerziehendJahrEuro: FREIBETRAG_ALLEINERZIEHEND_JAHR_EURO,
    kindErwerbMaxJahrEuro: FREIBETRAG_KIND_ERWERB_MAX_JAHR_EURO,
  },
};
