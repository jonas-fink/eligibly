import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EligibilityResult, SystemKey } from '@eligibility/shared';
import { BUNDESLAENDER, ERWERBSSTATUS_PRIMAER, type Bundesland, type ErwerbsstatusPrimaer } from '@eligibility/shared';

void BUNDESLAENDER;
void ERWERBSSTATUS_PRIMAER;

export interface WizardMitglied {
  id: string;
  geburtsdatum: string;
  istHauptantragsteller: boolean;
  istPartnerDesHauptantragstellers: boolean;
  istKind: boolean;
  erwerbsstatusPrimaer: ErwerbsstatusPrimaer;
  bruttoEuro: number;
  nettoEuro: number;
  kindergeldWirdBezogen?: boolean;
}

export interface WizardWohnen {
  plz: string;
  wohnort: string;
  bundesland: Bundesland;
  wohnverhaeltnis: 'miete' | 'eigentum';
  kaltmieteEuro: number;
  nebenkostenEuro: number;
  heizkostenEuro: number;
  wohnflaecheQm: number;
}

export interface ElterngeldWizard {
  geburtsdatumKind: string;
  nettoeinkommenVorGeburtMonatlichEuro: number;
  zuVersteuerndesEinkommenVorjahrEuro: number;
  wochenstundenWaehrendBezug: number;
  gewaehlteVariante: 'basis' | 'elterngeldPlus';
}

export interface WohngeldWizard {
  gemeindeschluessel: string;
  zinsenUndTilgungMonatlichEuro: number;
  grundsteuerJaehrlichEuro: number;
}

export interface UnterhaltsvorschussWizard {
  andererElternteilZahltKeinenOderUnzureichendenUnterhalt: boolean;
  andererElternteilIstUnbekanntOderVerstorben: boolean;
}

export interface KinderzuschlagWizard {
  kindEinkommenEuro: number;
}

export interface WizardState {
  schritt: 1 | 2 | 3 | 4;
  wohnen: WizardWohnen;
  mitglieder: WizardMitglied[];
  interessierendeSysteme: SystemKey[];
  elterngeld: ElterngeldWizard;
  wohngeld: WohngeldWizard;
  unterhaltsvorschuss: UnterhaltsvorschussWizard;
  kinderzuschlag: KinderzuschlagWizard;
  ergebnisse: EligibilityResult[] | null;
  rechtsstandAktuell: boolean;
  rechtsstandVersion: string;
  fehler: string | null;
  setSchritt: (s: 1 | 2 | 3 | 4) => void;
  setWohnen: (w: Partial<WizardWohnen>) => void;
  setMitglieder: (m: WizardMitglied[]) => void;
  setSysteme: (s: SystemKey[]) => void;
  setElterngeld: (e: Partial<ElterngeldWizard>) => void;
  setWohngeld: (e: Partial<WohngeldWizard>) => void;
  setUnterhaltsvorschuss: (e: Partial<UnterhaltsvorschussWizard>) => void;
  setKinderzuschlag: (e: Partial<KinderzuschlagWizard>) => void;
  setErgebnisse: (e: EligibilityResult[], meta: { aktuell: boolean; version: string }) => void;
  setFehler: (f: string | null) => void;
  leeren: () => void;
}

const heute = () => new Date().toISOString().slice(0, 10);

const anfang: Pick<
  WizardState,
  | 'schritt'
  | 'wohnen'
  | 'mitglieder'
  | 'interessierendeSysteme'
  | 'elterngeld'
  | 'wohngeld'
  | 'unterhaltsvorschuss'
  | 'kinderzuschlag'
  | 'ergebnisse'
  | 'rechtsstandAktuell'
  | 'rechtsstandVersion'
  | 'fehler'
> = {
  schritt: 1,
  wohnen: {
    plz: '',
    wohnort: '',
    bundesland: 'BE',
    wohnverhaeltnis: 'miete',
    kaltmieteEuro: 0,
    nebenkostenEuro: 0,
    heizkostenEuro: 0,
    wohnflaecheQm: 40,
  },
  mitglieder: [
    {
      id: 'haupt',
      geburtsdatum: '1990-01-01',
      istHauptantragsteller: true,
      istPartnerDesHauptantragstellers: false,
      istKind: false,
      erwerbsstatusPrimaer: 'angestellt',
      bruttoEuro: 0,
      nettoEuro: 0,
    },
  ],
  interessierendeSysteme: ['elterngeld'],
  elterngeld: {
    geburtsdatumKind: heute(),
    nettoeinkommenVorGeburtMonatlichEuro: 0,
    zuVersteuerndesEinkommenVorjahrEuro: 0,
    wochenstundenWaehrendBezug: 0,
    gewaehlteVariante: 'basis',
  },
  wohngeld: {
    gemeindeschluessel: '',
    zinsenUndTilgungMonatlichEuro: 0,
    grundsteuerJaehrlichEuro: 0,
  },
  unterhaltsvorschuss: {
    andererElternteilZahltKeinenOderUnzureichendenUnterhalt: false,
    andererElternteilIstUnbekanntOderVerstorben: false,
  },
  kinderzuschlag: {
    kindEinkommenEuro: 0,
  },
  ergebnisse: null,
  rechtsstandAktuell: true,
  rechtsstandVersion: '2026-01',
  fehler: null,
};

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      ...anfang,
      setSchritt: (schritt) => set({ schritt }),
      setWohnen: (w) => set((s) => ({ wohnen: { ...s.wohnen, ...w } })),
      setMitglieder: (mitglieder) => set({ mitglieder }),
      setSysteme: (interessierendeSysteme) => set({ interessierendeSysteme }),
      setElterngeld: (e) => set((s) => ({ elterngeld: { ...s.elterngeld, ...e } })),
      setWohngeld: (e) => set((s) => ({ wohngeld: { ...s.wohngeld, ...e } })),
      setUnterhaltsvorschuss: (e) => set((s) => ({ unterhaltsvorschuss: { ...s.unterhaltsvorschuss, ...e } })),
      setKinderzuschlag: (e) => set((s) => ({ kinderzuschlag: { ...s.kinderzuschlag, ...e } })),
      setErgebnisse: (ergebnisse, meta) =>
        set({
          ergebnisse,
          rechtsstandAktuell: meta.aktuell,
          rechtsstandVersion: meta.version,
          schritt: 4,
        }),
      setFehler: (fehler) => set({ fehler }),
      leeren: () => set(anfang),
    }),
    {
      name: 'eligibility-wizard',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        schritt: s.schritt,
        wohnen: s.wohnen,
        mitglieder: s.mitglieder,
        interessierendeSysteme: s.interessierendeSysteme,
        elterngeld: s.elterngeld,
        wohngeld: s.wohngeld,
        unterhaltsvorschuss: s.unterhaltsvorschuss,
        kinderzuschlag: s.kinderzuschlag,
      }),
    },
  ),
);

export function flagsFuer(primaer: ErwerbsstatusPrimaer) {
  return {
    isEmployed: primaer === 'angestellt',
    isSelfEmployed: primaer === 'selbststaendig',
    isStudent: primaer === 'studium' || primaer === 'schulisch' || primaer === 'ausbildung',
    isRetired: primaer === 'rente',
    isUnemployed: primaer === 'arbeitslos',
    hasDisability: false,
  };
}
