import type { KonstantenSet } from './2026-01.js';
import { set202601 } from './2026-01.js';

export const SETS = {
  '2026-01': set202601,
} as const;

export type RechtsstandVersion = keyof typeof SETS;

export function istRechtsstandVersion(version: string): version is RechtsstandVersion {
  return version in SETS;
}

export function ladeKonstanten(version: string): KonstantenSet {
  if (!istRechtsstandVersion(version)) {
    throw new UnbekannterRechtsstand(version);
  }
  return SETS[version];
}

export function aktuellerRechtsstand(stichtag: string): RechtsstandVersion {
  const versionen = Object.values(SETS);
  const passend = versionen.find((s) => stichtag >= s.gueltigVon && stichtag <= s.gueltigBis);
  if (passend) return passend.version as RechtsstandVersion;
  const neueste = versionen.reduce((a, b) => (a.gueltigBis >= b.gueltigBis ? a : b));
  return neueste.version as RechtsstandVersion;
}

export function istRechtsstandAktuell(version: string, stichtag: string): boolean {
  const set = SETS[version as RechtsstandVersion];
  if (!set) return false;
  return stichtag >= set.gueltigVon && stichtag <= set.gueltigBis;
}

export function tageBisAblaufNeuesterStand(heute: Date = new Date()): number {
  const neueste = Object.values(SETS).reduce((a, b) => (a.gueltigBis >= b.gueltigBis ? a : b));
  const bis = new Date(`${neueste.gueltigBis}T00:00:00+01:00`);
  return Math.ceil((bis.getTime() - heute.getTime()) / (24 * 60 * 60 * 1000));
}

export class UnbekannterRechtsstand extends Error {
  constructor(version: string) {
    super(`Unbekannter Rechtsstand: ${version}`);
    this.name = 'UnbekannterRechtsstand';
  }
}

export type { KonstantenSet };
