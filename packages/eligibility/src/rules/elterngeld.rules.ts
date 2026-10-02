import { ElterngeldAnswersSchema } from '@eligibility/shared';
import type { ModuleCalculation } from '@eligibility/shared';
import type { EligibilityInput, RuleModul } from './types.js';
import type { KonstantenSet } from '../constants/2026-01.js';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export const elterngeldRegel: RuleModul = {
  system: 'elterngeld',
  calculate(input: EligibilityInput, konstanten: KonstantenSet): ModuleCalculation {
    const kinder = input.haushalt.mitglieder.filter((m) => m.istKind);
    const parsed = ElterngeldAnswersSchema.safeParse(input.systemSpecificAnswers?.['elterngeld']);

    if (kinder.length === 0) {
      return {
        system: 'elterngeld',
        berechnungsart: 'lohnersatz',
        voraussetzungenErfuellt: false,
        betragCent: 0,
        imGrenzbereich: false,
        datenluecken: [],
      };
    }

    if (!parsed.success) {
      return {
        system: 'elterngeld',
        berechnungsart: 'lohnersatz',
        voraussetzungenErfuellt: false,
        betragCent: 0,
        imGrenzbereich: false,
        datenluecken: ['Angaben zum Elterngeld unvollstaendig'],
      };
    }

    const a = parsed.data;
    const k = konstanten.elterngeld;
    const nichtErfuellt: string[] = [];

    if (a.zuVersteuerndesEinkommenVorjahrCent > k.einkommensgrenzeVorjahrCent) {
      nichtErfuellt.push('zu versteuerndes Einkommen ueber der Grenze');
    }
    if (a.wochenstundenWaehrendBezug > k.maxWochenstunden) {
      nichtErfuellt.push('Wochenstunden waehrend des Bezugs zu hoch');
    }

    const ersatzrate = 0.65;
    const roh = Math.round(a.nettoeinkommenVorGeburtMonatlichCent * ersatzrate);
    const basis = clamp(roh, k.mindestbetragBasisCent, k.hoechstbetragBasisCent);
    const betragCent = a.gewaehlteVariante === 'elterngeldPlus' ? Math.round(basis / 2) : basis;

    return {
      system: 'elterngeld',
      berechnungsart: 'lohnersatz',
      voraussetzungenErfuellt: nichtErfuellt.length === 0,
      betragCent: nichtErfuellt.length === 0 ? betragCent : 0,
      imGrenzbereich: false,
      datenluecken: [],
      betrifftPersonId: input.haushalt.mitglieder.find((m) => m.istHauptantragsteller)?.id,
    };
  },
};
