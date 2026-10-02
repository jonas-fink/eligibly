import type { ModuleCalculation, SystemKey } from '@eligibility/shared';

export function nichtPruefbar(system: SystemKey, luecke: string): ModuleCalculation {
  return {
    system,
    berechnungsart: system === 'wbs' ? 'berechtigung' : system === 'elterngeld' ? 'lohnersatz' : 'bedarfsdeckung',
    voraussetzungenErfuellt: false,
    betragCent: 0,
    imGrenzbereich: false,
    datenluecken: [luecke],
  };
}
