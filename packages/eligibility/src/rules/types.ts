import type { Haushalt, ModuleCalculation, SystemKey } from '@eligibility/shared';
import type { KonstantenSet } from '../constants/2026-01.js';
import type { ReferenzdatenPort } from '../ports/referenzdaten.js';

export interface Leistungsanteil {
  betragCent: number;
  teilbetraege?: { personId: string; betragCent: number }[];
}

export interface EligibilityInput {
  haushalt: Haushalt;
  systemSpecificAnswers?: Record<string, unknown>;
  zusaetzlichesEinkommenCent?: Partial<Record<SystemKey, number>>;
  zusaetzlicheLeistungen?: Partial<Record<SystemKey, Leistungsanteil>>;
}

export interface RuleModul {
  system: SystemKey;
  calculate(input: EligibilityInput, konstanten: KonstantenSet, referenz: ReferenzdatenPort): ModuleCalculation;
}
