import type { EligibilityResult, ModuleCalculation, SystemKey } from '@eligibility/shared';
import { expandiereZuSystemgruppen } from '@eligibility/shared';
import type { Haushalt } from '@eligibility/shared';
import type { KonstantenSet } from './constants/2026-01.js';
import type { ReferenzdatenPort } from './ports/referenzdaten.js';
import { elterngeldRegel } from './rules/elterngeld.rules.js';
import { wohngeldRegel } from './rules/wohngeld.rules.js';
import { KINDERZUSCHLAG_NAECHSTE_SCHRITTE, kinderzuschlagRegel } from './rules/kinderzuschlag.rules.js';
import {
  UNTERHALTSVORSCHUSS_NAECHSTE_SCHRITTE,
  unterhaltsvorschussRegel,
} from './rules/unterhaltsvorschuss.rules.js';
import { nichtPruefbar } from './rules/stub.rules.js';
import type { EligibilityInput, Leistungsanteil, RuleModul } from './rules/types.js';

const STUB_LUECKE = 'Modul noch nicht implementiert';

const MODULE: Record<SystemKey, RuleModul> = {
  elterngeld: elterngeldRegel,
  wohngeld: wohngeldRegel,
  grundsicherung: { system: 'grundsicherung', calculate: () => nichtPruefbar('grundsicherung', STUB_LUECKE) },
  kinderzuschlag: kinderzuschlagRegel,
  buergergeld: { system: 'buergergeld', calculate: () => nichtPruefbar('buergergeld', STUB_LUECKE) },
  bafoeg: { system: 'bafoeg', calculate: () => nichtPruefbar('bafoeg', STUB_LUECKE) },
  unterhaltsvorschuss: unterhaltsvorschussRegel,
  wbs: { system: 'wbs', calculate: () => nichtPruefbar('wbs', STUB_LUECKE) },
};

export interface PrecedenceRule {
  id: string;
  beschreibung: string;
  wennBerechtigt: SystemKey;
  dannNachrangig: SystemKey;
  begruendungFuerNutzer: string;
}

export const PRECEDENCE_RULES: PrecedenceRule[] = [
  {
    id: 'wohngeld-ausschluss-neue-grundsicherung',
    beschreibung: '§ 7 WoGG — Bezug der Neuen Grundsicherung schließt Wohngeld aus',
    wennBerechtigt: 'buergergeld',
    dannNachrangig: 'wohngeld',
    begruendungFuerNutzer:
      'Weil die Unterkunftskosten bereits in der Neuen Grundsicherung enthalten sind, gibt es daneben kein Wohngeld.',
  },
  {
    id: 'wohngeld-ausschluss-grundsicherung-sgb-xii',
    beschreibung: '§ 7 WoGG — Bezug von Grundsicherung im Alter/bei Erwerbsminderung schließt Wohngeld aus',
    wennBerechtigt: 'grundsicherung',
    dannNachrangig: 'wohngeld',
    begruendungFuerNutzer:
      'Weil die Unterkunftskosten bereits in der Grundsicherung enthalten sind, gibt es daneben kein Wohngeld.',
  },
];

export interface EinkommensanrechnungsRule {
  id: string;
  quelle: SystemKey;
  ziel: SystemKey;
  anteil: number;
  beschreibung: string;
}

export const ANRECHNUNGS_RULES: EinkommensanrechnungsRule[] = [
  {
    id: 'uvg-wohngeld',
    quelle: 'unterhaltsvorschuss',
    ziel: 'wohngeld',
    anteil: 1,
    beschreibung: '§ 14 Abs. 2 Nr. 21 WoGG — Unterhaltsvorschuss als Einkommen des Kindes',
  },
  {
    id: 'uvg-kiz',
    quelle: 'unterhaltsvorschuss',
    ziel: 'kinderzuschlag',
    anteil: 0.45,
    beschreibung: '§ 6a Abs. 3 BKGG — Unterhaltsvorschuss als Kindeseinkommen, 45 %',
  },
];

export function istAnspruchsberechtigt(calc?: ModuleCalculation): boolean {
  return !!calc && calc.voraussetzungenErfuellt && calc.betragCent > 0;
}

export function validierePrecedenceRules(regeln: PrecedenceRule[] = PRECEDENCE_RULES): void {
  const gewinner = new Set(regeln.map((r) => r.wennBerechtigt));
  const verlierer = new Set(regeln.map((r) => r.dannNachrangig));
  for (const g of gewinner) {
    if (verlierer.has(g)) {
      throw new Error(`Precedence-Regel verletzt Tiefe-1/Azyklizitaet bei ${g}`);
    }
  }
}

export function validiereAnrechnungsRules(regeln: EinkommensanrechnungsRule[] = ANRECHNUNGS_RULES): void {
  const adj = new Map<SystemKey, SystemKey[]>();
  for (const r of regeln) {
    const liste = adj.get(r.quelle) ?? [];
    liste.push(r.ziel);
    adj.set(r.quelle, liste);
  }
  const visiting = new Set<SystemKey>();
  const visited = new Set<SystemKey>();
  const visit = (n: SystemKey): void => {
    if (visiting.has(n)) throw new Error(`Anrechnungsregel zyklisch bei ${n}`);
    if (visited.has(n)) return;
    visiting.add(n);
    for (const next of adj.get(n) ?? []) visit(next);
    visiting.delete(n);
    visited.add(n);
  };
  for (const n of adj.keys()) visit(n);
}

function alsNachrangig(
  calc: ModuleCalculation,
  durch: SystemKey[],
  grund: 'ausschluss' | 'vermeidung',
): ModuleCalculation {
  return { ...calc, betragCent: 0, nachrangigDurch: durch, nachrangigGrund: grund };
}

function wendeVermeidungspruefungAn(calcs: Partial<Record<SystemKey, ModuleCalculation>>): void {
  const ng = calcs.buergergeld;
  const kiz = calcs.kinderzuschlag;
  const wg = calcs.wohngeld;
  if (!ng || ng.berechnungsart !== 'bedarfsdeckung') return;
  if (!kiz && !wg) return;
  if (!istAnspruchsberechtigt(ng)) return;
  if (ng.imGrenzbereich) return;

  const zuSchliessendeLuecke = ng.bedarfslueckeCent ?? 0;
  const vermeidungspaket =
    (istAnspruchsberechtigt(kiz) ? (kiz?.betragCent ?? 0) : 0) +
    (istAnspruchsberechtigt(wg) ? (wg?.betragCent ?? 0) : 0);

  const verdraengendeSysteme = (): SystemKey[] => [
    ...(istAnspruchsberechtigt(kiz) ? (['kinderzuschlag'] as const) : []),
    ...(istAnspruchsberechtigt(wg) ? (['wohngeld'] as const) : []),
  ];

  if (vermeidungspaket >= zuSchliessendeLuecke) {
    calcs.buergergeld = alsNachrangig(ng, [...verdraengendeSysteme()], 'vermeidung');
  } else if (kiz) {
    calcs.kinderzuschlag = alsNachrangig(kiz, ['buergergeld'], 'vermeidung');
  }
}

function wendePrecedenceRulesAn(calcs: Partial<Record<SystemKey, ModuleCalculation>>): void {
  for (const regel of PRECEDENCE_RULES) {
    const gewinner = calcs[regel.wennBerechtigt];
    const verlierer = calcs[regel.dannNachrangig];
    if (istAnspruchsberechtigt(gewinner) && verlierer) {
      calcs[regel.dannNachrangig] = alsNachrangig(verlierer, [regel.wennBerechtigt], 'ausschluss');
    }
  }
}

function markiereUnklarenVorrang(calcs: Partial<Record<SystemKey, ModuleCalculation>>): void {
  for (const regel of PRECEDENCE_RULES) {
    const gewinner = calcs[regel.wennBerechtigt];
    const verlierer = calcs[regel.dannNachrangig];
    if (!gewinner || !verlierer) continue;
    if (!istAnspruchsberechtigt(gewinner) && gewinner.imGrenzbereich) {
      verlierer.vorrangUnklar = [...(verlierer.vorrangUnklar ?? []), regel.wennBerechtigt];
    }
  }
}

function genauigkeitFuer(system: SystemKey): 'grob' | 'detailliert' {
  if (system === 'grundsicherung' || system === 'buergergeld' || system === 'bafoeg') return 'grob';
  return 'detailliert';
}

function betragsartFuer(system: SystemKey): EligibilityResult['betragsart'] {
  if (system === 'wbs') return 'keineGeldleistung';
  if (system === 'bafoeg') return 'zuschussUndDarlehen';
  return 'zuschuss';
}

export function toResult(
  calc: ModuleCalculation,
  konstanten: KonstantenSet,
  sichtbarkeit: 'ausgewaehlt' | 'gruppe',
): EligibilityResult {
  void sichtbarkeit;
  let eligible: EligibilityResult['eligible'];
  if (calc.datenluecken.length > 0 && !calc.voraussetzungenErfuellt && calc.betragCent === 0) {
    eligible = 'nicht_pruefbar';
  } else if (calc.nachrangigDurch && calc.nachrangigDurch.length > 0) {
    eligible = 'nachrangig';
  } else if (!calc.voraussetzungenErfuellt) {
    eligible = 'nein';
  } else if (calc.imGrenzbereich) {
    eligible = 'vielleicht';
  } else if (calc.betragCent > 0 || calc.berechnungsart === 'berechtigung') {
    eligible = 'ja';
  } else {
    eligible = 'nein';
  }

  const genauigkeit = genauigkeitFuer(calc.system);
  const u = konstanten.unschaerfe[calc.system];
  let betragSpanneCent: EligibilityResult['betragSpanneCent'];
  if (genauigkeit === 'grob' && eligible !== 'nicht_pruefbar' && u && calc.betragCent > 0) {
    const delta = Math.max(u.absolutMinCent, Math.round(calc.betragCent * u.relativ));
    const vonCent = Math.max(0, Math.floor((calc.betragCent - delta) / 1000) * 1000);
    const bisCent = Math.ceil((calc.betragCent + delta) / 1000) * 1000;
    betragSpanneCent = { vonCent, bisCent };
    if (vonCent === 0 && eligible === 'ja') eligible = 'vielleicht';
  }

  const naechsteSchritte = schritteFuer(calc, eligible);

  return {
    system: calc.system,
    eligible,
    ausgeschlossenDurch: calc.nachrangigDurch,
    nachrangigGrund: calc.nachrangigGrund,
    vorrangUnklar: calc.vorrangUnklar,
    geschaetzterBetragCent:
      eligible === 'nicht_pruefbar' || betragsartFuer(calc.system) === 'keineGeldleistung'
        ? undefined
        : calc.betragCent,
    betragSpanneCent,
    betragAufteilungCent: calc.betragAufteilungCent,
    betragsart: betragsartFuer(calc.system),
    genauigkeit,
    betrifftPersonId: calc.betrifftPersonId,
    teilbetraege: calc.teilbetraege,
    datenlage: calc.datenluecken.length > 0 ? 'unvollstaendig' : 'vollstaendig',
    datenluecken: calc.datenluecken.length > 0 ? calc.datenluecken : undefined,
    begruendung: {
      erfuellteKriterien: calc.voraussetzungenErfuellt ? ['Eingangsvoraussetzungen geprueft'] : [],
      nichtErfuellteKriterien: calc.voraussetzungenErfuellt ? [] : calc.datenluecken,
    },
    naechsteSchritte,
    rechtsstandVersion: konstanten.version,
  };
}

function schritteFuer(
  calc: ModuleCalculation,
  eligible: EligibilityResult['eligible'],
): EligibilityResult['naechsteSchritte'] {
  const standard = {
    beschreibung:
      eligible === 'nachrangig'
        ? 'Diese Leistung tritt hinter eine andere zurueck.'
        : eligible === 'ja' || eligible === 'vielleicht'
          ? 'Antrag stellen bei der zustaendigen Stelle.'
          : eligible === 'nicht_pruefbar'
            ? 'Die fehlende Grundlage klaeren.'
            : 'Kein eigener Antragsweg aus diesem Ergebnis.',
    benoetigteUnterlagen: [] as string[],
    zustaendigeStelle: '',
  };

  const modulSchritte =
    calc.system === 'unterhaltsvorschuss'
      ? UNTERHALTSVORSCHUSS_NAECHSTE_SCHRITTE
      : calc.system === 'kinderzuschlag'
        ? KINDERZUSCHLAG_NAECHSTE_SCHRITTE
        : null;
  if (!modulSchritte) return standard;

  const hinweis = (calc.hinweise ?? []).join(' ');
  if (eligible === 'ja' || eligible === 'vielleicht') {
    return {
      ...modulSchritte,
      beschreibung: hinweis ? `${modulSchritte.beschreibung} ${hinweis}` : modulSchritte.beschreibung,
    };
  }
  if (eligible === 'nein' && hinweis) {
    return { ...standard, beschreibung: `${standard.beschreibung} ${hinweis}` };
  }
  return standard;
}

function topologischSortiert(keys: SystemKey[]): SystemKey[] {
  const relevant = ANRECHNUNGS_RULES.filter((r) => keys.includes(r.quelle) && keys.includes(r.ziel));
  const indeg = new Map<SystemKey, number>(keys.map((k) => [k, 0]));
  for (const r of relevant) {
    indeg.set(r.ziel, (indeg.get(r.ziel) ?? 0) + 1);
  }
  const queue = keys.filter((k) => (indeg.get(k) ?? 0) === 0);
  const out: SystemKey[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    out.push(n);
    for (const r of relevant.filter((x) => x.quelle === n)) {
      const next = (indeg.get(r.ziel) ?? 1) - 1;
      indeg.set(r.ziel, next);
      if (next === 0) queue.push(r.ziel);
    }
  }
  return out.length === keys.length ? out : keys;
}

export function evaluateHaushalt(
  haushalt: Haushalt,
  interessierendeSysteme: SystemKey[],
  answers: Record<string, unknown> | undefined,
  konstanten: KonstantenSet,
  referenz: ReferenzdatenPort,
): Record<SystemKey, EligibilityResult> {
  validierePrecedenceRules();
  validiereAnrechnungsRules();

  const zuBerechnen = expandiereZuSystemgruppen(interessierendeSysteme);
  const roh: Partial<Record<SystemKey, ModuleCalculation>> = {};
  const extra: Partial<Record<SystemKey, number>> = {};
  const leistungen: Partial<Record<SystemKey, Leistungsanteil>> = {};

  for (const system of topologischSortiert(zuBerechnen)) {
    const input: EligibilityInput = {
      haushalt,
      systemSpecificAnswers: answers,
      zusaetzlichesEinkommenCent: extra,
      zusaetzlicheLeistungen: leistungen,
    };
    const calc = MODULE[system].calculate(input, konstanten, referenz);
    roh[system] = calc;
    const betragCent = istAnspruchsberechtigt(calc) ? calc.betragCent : 0;
    extra[system] = betragCent;
    if (betragCent > 0) {
      leistungen[system] = {
        betragCent,
        teilbetraege: calc.teilbetraege?.map((teil) => ({
          personId: teil.personId,
          betragCent: teil.betragCent,
        })),
      };
    }
  }

  wendeVermeidungspruefungAn(roh);
  wendePrecedenceRulesAn(roh);
  markiereUnklarenVorrang(roh);

  const alle = {} as Record<SystemKey, EligibilityResult>;
  for (const system of zuBerechnen) {
    const calc = roh[system];
    if (!calc) continue;
    alle[system] = toResult(calc, konstanten, interessierendeSysteme.includes(system) ? 'ausgewaehlt' : 'gruppe');
  }
  return alle;
}
