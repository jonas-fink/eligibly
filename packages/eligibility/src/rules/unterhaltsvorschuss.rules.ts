import {
  UnterhaltsvorschussAnswersSchema,
  alterAm,
  type ModuleCalculation,
} from '@eligibility/shared';
import type { KonstantenSet } from '../constants/2026-01.js';
import type { EligibilityInput, RuleModul } from './types.js';

export const UNTERHALTSVORSCHUSS_NAECHSTE_SCHRITTE = {
  beschreibung:
    'Unterhaltsvorschuss wird beim Jugendamt der Wohnortgemeinde beantragt. Der Vorschuss wird vom Staat beim unterhaltspflichtigen Elternteil zurückgefordert.',
  benoetigteUnterlagen: [
    'Geburtsurkunde des Kindes',
    'Nachweis über ausbleibende oder unzureichende Unterhaltszahlungen',
    'Eigener Einkommensnachweis bei Kindern ab 12 Jahren',
    'Kindergeldbescheid',
  ],
  zustaendigeStelle: 'Jugendamt / Unterhaltsvorschusskasse der Wohnortgemeinde.',
};

/** Ausnahmen ab 12 werden benannt, nicht gerechnet (Modul-Spec Abschnitt 6). */
export const HINWEIS_AB_12_JAHREN =
  'Ab 12 Jahren gibt es Unterhaltsvorschuss nur unter zusätzlichen Bedingungen. Von denen gibt es Ausnahmen — etwa wenn der Vorschuss die Hilfebedürftigkeit gerade vermeiden würde. Frag im Zweifel beim Jugendamt nach.';

const EINKOMMENSGRENZE_ALTER = 12;

function altersgruppe(alter: number): string {
  if (alter <= 5) return '0 bis 5 Jahre';
  if (alter <= 11) return '6 bis 11 Jahre';
  return '12 bis 17 Jahre';
}

function mindestunterhaltCent(alter: number, k: KonstantenSet['unterhaltsvorschuss']): number {
  if (alter <= 5) return k.mindestunterhalt0bis5Cent;
  if (alter <= 11) return k.mindestunterhalt6bis11Cent;
  return k.mindestunterhalt12bis17Cent;
}

function leer(datenluecken: string[]): ModuleCalculation {
  return {
    system: 'unterhaltsvorschuss',
    berechnungsart: 'bedarfsdeckung',
    voraussetzungenErfuellt: false,
    betragCent: 0,
    imGrenzbereich: false,
    datenluecken,
  };
}

export const unterhaltsvorschussRegel: RuleModul = {
  system: 'unterhaltsvorschuss',
  calculate(input: EligibilityInput, konstanten: KonstantenSet): ModuleCalculation {
    const { haushalt } = input;
    const k = konstanten.unterhaltsvorschuss;

    if (haushalt.haushaltstyp !== 'alleinerziehend') {
      return leer([]);
    }

    const kinder = haushalt.mitglieder.filter((m) => m.istKind);
    const minderjaehrig = kinder.filter(
      (kind) => alterAm(kind.geburtsdatum, haushalt.pruefungsStichtag) < k.altersgrenzeJahre,
    );
    if (minderjaehrig.length === 0) {
      return leer([]);
    }

    const parsed = UnterhaltsvorschussAnswersSchema.safeParse(
      input.systemSpecificAnswers?.['unterhaltsvorschuss'],
    );
    if (!parsed.success) {
      return leer(['Angaben zum Unterhaltsvorschuss unvollständig']);
    }

    const andererElternteil =
      parsed.data.andererElternteilZahltKeinenOderUnzureichendenUnterhalt ||
      parsed.data.andererElternteilIstUnbekanntOderVerstorben === true;

    const betreuend = haushalt.mitglieder.find((m) => m.istHauptantragsteller);
    const bruttoCent = betreuend?.einkommen.bruttoMonatlichCent ?? 0;

    const teilbetraege: NonNullable<ModuleCalculation['teilbetraege']> = [];
    let hinweisAb12 = false;

    for (const kind of minderjaehrig) {
      const alter = alterAm(kind.geburtsdatum, haushalt.pruefungsStichtag);
      if (alter >= EINKOMMENSGRENZE_ALTER) hinweisAb12 = true;
      const einkommenOk = alter < EINKOMMENSGRENZE_ALTER || bruttoCent >= k.mindesteinkommenAb12Cent;
      if (!andererElternteil || !einkommenOk) continue;
      const betragCent = Math.max(0, mindestunterhaltCent(alter, k) - konstanten.KINDERGELD_MONATLICH_CENT);
      if (betragCent <= 0) continue;
      teilbetraege.push({
        personId: kind.id,
        betragCent,
        hinweis: `Altersgruppe ${altersgruppe(alter)}`,
      });
    }

    const betragCent = teilbetraege.reduce((summe, teil) => summe + teil.betragCent, 0);
    return {
      system: 'unterhaltsvorschuss',
      berechnungsart: 'bedarfsdeckung',
      voraussetzungenErfuellt: betragCent > 0,
      betragCent,
      imGrenzbereich: false,
      datenluecken: [],
      hinweise: hinweisAb12 ? [HINWEIS_AB_12_JAHREN] : undefined,
      teilbetraege: teilbetraege.length > 0 ? teilbetraege : undefined,
    };
  },
};
