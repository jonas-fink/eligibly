import type { SystemKey } from '@eligibility/shared';
import { wohngeldKonstanten202601, type WohngeldKonstanten } from './wohngeld.js';
import {
  unterhaltsvorschussKonstanten202601,
  type UnterhaltsvorschussKonstanten,
} from './unterhaltsvorschuss.js';
import { kinderzuschlagKonstanten202601, type KinderzuschlagKonstanten } from './kinderzuschlag.js';

export interface Unschaerfe {
  relativ: number;
  absolutMinCent: number;
}

export interface SchwellenwertVielleicht {
  absolutEuroCent: number;
  relativZumBedarf: number;
}

export interface KonstantenSet {
  version: string;
  gueltigVon: string;
  gueltigBis: string;
  KINDERGELD_MONATLICH_CENT: number;
  SCHWELLENWERT_VIELLEICHT: SchwellenwertVielleicht;
  unschaerfe: Partial<Record<SystemKey, Unschaerfe>>;
  elterngeld: {
    einkommensgrenzeVorjahrCent: number;
    mindestbetragBasisCent: number;
    hoechstbetragBasisCent: number;
    maxWochenstunden: number;
  };
  wohngeld: WohngeldKonstanten;
  unterhaltsvorschuss: UnterhaltsvorschussKonstanten;
  kinderzuschlag: KinderzuschlagKonstanten;
}

export const set202601: KonstantenSet = {
  version: '2026-01',
  gueltigVon: '2026-01-01',
  gueltigBis: '2026-12-31',
  /** § 66 EStG, erstes Kind, ab 01.01.2026. */
  KINDERGELD_MONATLICH_CENT: 25_900,
  SCHWELLENWERT_VIELLEICHT: {
    absolutEuroCent: 5000,
    relativZumBedarf: 0.05,
  },
  unschaerfe: {
    grundsicherung: { relativ: 0.15, absolutMinCent: 3000 },
    buergergeld: { relativ: 0.15, absolutMinCent: 3000 },
    bafoeg: { relativ: 0.2, absolutMinCent: 3000 },
  },
  elterngeld: {
    einkommensgrenzeVorjahrCent: 17_500_000,
    mindestbetragBasisCent: 30000,
    hoechstbetragBasisCent: 180000,
    maxWochenstunden: 32,
  },
  wohngeld: wohngeldKonstanten202601,
  unterhaltsvorschuss: unterhaltsvorschussKonstanten202601,
  kinderzuschlag: kinderzuschlagKonstanten202601,
};
