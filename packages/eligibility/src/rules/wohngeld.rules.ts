import { Decimal } from 'decimal.js';
import { WohngeldAnswersSchema, alterAm, type Haushalt, type ModuleCalculation } from '@eligibility/shared';
import type { KonstantenSet } from '../constants/2026-01.js';
import {
  ABZUEGE_NACH_ERWERB,
  anlage2Fuer,
  hoechstbetragEuro,
  mindestMEuro,
  mindestYEuro,
} from '../constants/wohngeld.js';
import type { Mietstufe, ReferenzdatenPort } from '../ports/referenzdaten.js';
import type { EligibilityInput, RuleModul } from './types.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

function centNachEuro(cent: number): number {
  return cent / 100;
}

function euroNachCent(euro: number): number {
  return Math.round(euro * 100);
}

/**
 * § 19 WoGG i.V.m. Anlage 3: W = 1,15 × (M − (a + b·M + c·Y) × Y)
 * Festkomma mit zehn Nachkommastellen, kaufmännische Rundung auf volle Euro.
 */
export function berechneNachAnlage3(n: number, mEuro: number, yEuro: number): number {
  const coeffs = anlage2Fuer(Math.min(n, 12));
  const M = new Decimal(mEuro);
  const Y = new Decimal(yEuro);
  const a = new Decimal(coeffs.a);
  const b = new Decimal(coeffs.b);
  const c = new Decimal(coeffs.c);

  const z1 = a.plus(b.times(M)).plus(c.times(Y)).toDecimalPlaces(10);
  const z2 = z1.times(Y).toDecimalPlaces(10);
  const z3 = M.minus(z2).toDecimalPlaces(10);
  const z4 = new Decimal(1.15).times(z3).toDecimalPlaces(10);
  const gerundet = z4.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  return Math.max(0, gerundet);
}

export function ermittleMietstufe(
  haushalt: Haushalt,
  answers: ReturnType<typeof WohngeldAnswersSchema.parse> | undefined,
  referenz: ReferenzdatenPort,
): { mietstufe?: Mietstufe; datenluecken: string[] } {
  if (answers?.mietstufe) {
    return { mietstufe: answers.mietstufe, datenluecken: [] };
  }
  if (answers?.gemeindeschluessel) {
    const ms = referenz.mietstufeFuerAgs(answers.gemeindeschluessel);
    if (ms) return { mietstufe: ms, datenluecken: [] };
    return { datenluecken: ['Mietstufe für diesen Wohnort nicht hinterlegt'] };
  }
  const agsListe = referenz.agsFuerPlz(haushalt.wohnsituation.plz);
  if (agsListe.length === 0) {
    return { datenluecken: ['Mietstufe für diesen Wohnort nicht hinterlegt'] };
  }
  const stufen = [...new Set(agsListe.map((a) => referenz.mietstufeFuerAgs(a)).filter(Boolean))] as Mietstufe[];
  if (stufen.length === 1) {
    return { mietstufe: stufen[0], datenluecken: [] };
  }
  if (stufen.length > 1) {
    return { datenluecken: ['Gemeinde zur Postleitzahl nicht eindeutig — bitte Gemeinde wählen'] };
  }
  return { datenluecken: ['Mietstufe für diesen Wohnort nicht hinterlegt'] };
}

function bereinigteMieteOderBelastungEuro(
  haushalt: Haushalt,
  answers: ReturnType<typeof WohngeldAnswersSchema.parse> | undefined,
  n: number,
  mietstufe: Mietstufe,
  wg: KonstantenSet['wohngeld'],
): { mEuro?: number; datenluecken: string[]; hoechstEuro: number } {
  const hoechstEuro = hoechstbetragEuro(n, mietstufe);

  if (haushalt.wohnsituation.wohnverhaeltnis === 'eigentum') {
    const zinsTilgung = answers?.zinsenUndTilgungMonatlichCent;
    if (zinsTilgung === undefined) {
      return {
        hoechstEuro,
        datenluecken: ['Angaben zur Belastung (Zins und Tilgung) fehlen'],
      };
    }
    const zinsTilgungEuro = centNachEuro(zinsTilgung);
    if (zinsTilgungEuro >= hoechstEuro) {
      return { mEuro: hoechstEuro, datenluecken: [], hoechstEuro };
    }
    if (answers?.grundsteuerJaehrlichCent === undefined) {
      return {
        hoechstEuro,
        datenluecken: ['Angaben zur Belastung (Grundsteuer) fehlen'],
      };
    }
    const bewirtschaftung =
      (haushalt.wohnsituation.wohnflaecheQm * wg.bewirtschaftungEuroProQmJahr) / 12 +
      centNachEuro(answers.grundsteuerJaehrlichCent) / 12 +
      centNachEuro(answers.verwaltungskostenAnDritteJaehrlichCent ?? 0) / 12;
    const belastung = zinsTilgungEuro + bewirtschaftung;
    const mEuro = Math.max(mindestMEuro(n), Math.min(belastung, hoechstEuro));
    return { mEuro, datenluecken: [], hoechstEuro };
  }

  const bruttokaltEuro =
    centNachEuro(haushalt.wohnsituation.kaltmieteCent) +
    centNachEuro(haushalt.wohnsituation.nebenkostenCent);
  const mEuro = Math.max(mindestMEuro(n), Math.min(bruttokaltEuro, hoechstEuro));
  return { mEuro, datenluecken: [], hoechstEuro };
}

function bereinigtesEinkommenYEuro(
  haushalt: Haushalt,
  answers: ReturnType<typeof WohngeldAnswersSchema.parse> | undefined,
  zusaetzlichesEinkommenCent: Partial<Record<string, number>> | undefined,
  n: number,
  wg: KonstantenSet['wohngeld'],
): number {
  let jahrEuro = 0;

  for (const m of haushalt.mitglieder) {
    const bruttoJahr = centNachEuro(m.einkommen.bruttoMonatlichCent) * 12;
    const korrektur = answers?.abzuegeKorrektur?.[m.id];
    const satz = korrektur ?? ABZUEGE_NACH_ERWERB[m.erwerbsstatusPrimaer];
    let abzug = 0;
    if (satz.steuern) abzug += 0.1;
    if (satz.kvPv) abzug += 0.1;
    if (satz.rv) abzug += 0.1;
    jahrEuro += bruttoJahr * (1 - abzug);
  }

  // UVG: § 14 Abs. 2 Nr. 21 WoGG — 100 %, ohne § 16/§ 17
  const uvgMonatCent = zusaetzlichesEinkommenCent?.['unterhaltsvorschuss'] ?? 0;
  jahrEuro += centNachEuro(uvgMonatCent) * 12;

  let freibetraege = 0;
  for (const id of answers?.schwerbehindertGdB100 ?? []) {
    if (haushalt.mitglieder.some((m) => m.id === id)) {
      freibetraege += wg.freibetraege.schwerbehinderungJahrEuro;
    }
  }
  for (const id of answers?.opferNsVerfolgung ?? []) {
    if (haushalt.mitglieder.some((m) => m.id === id)) {
      freibetraege += wg.freibetraege.nsJahrEuro;
    }
  }
  if (haushalt.haushaltstyp === 'alleinerziehend') {
    freibetraege += wg.freibetraege.alleinerziehendJahrEuro;
  }
  for (const kind of haushalt.mitglieder.filter((m) => m.istKind)) {
    const alter = alterAm(kind.geburtsdatum, haushalt.pruefungsStichtag);
    if (alter >= 25) continue;
    const erwerbJahr = centNachEuro(kind.einkommen.arten.erwerbstaetigkeitCent) * 12;
    freibetraege += Math.min(erwerbJahr, wg.freibetraege.kindErwerbMaxJahrEuro);
  }

  const y = (jahrEuro - freibetraege) / 12;
  return Math.max(mindestYEuro(n), y);
}

export const wohngeldRegel: RuleModul = {
  system: 'wohngeld',
  calculate(input: EligibilityInput, konstanten: KonstantenSet, referenz: ReferenzdatenPort): ModuleCalculation {
    const parsed = WohngeldAnswersSchema.safeParse(input.systemSpecificAnswers?.['wohngeld'] ?? {});
    const answers = parsed.success ? parsed.data : undefined;
    const n = input.haushalt.anzahlPersonen;
    const { mietstufe, datenluecken: mietLuecken } = ermittleMietstufe(input.haushalt, answers, referenz);

    if (!mietstufe) {
      return {
        system: 'wohngeld',
        berechnungsart: 'bedarfsdeckung',
        voraussetzungenErfuellt: false,
        betragCent: 0,
        imGrenzbereich: false,
        datenluecken: mietLuecken,
      };
    }

    const { mEuro, datenluecken: lastenLuecken } = bereinigteMieteOderBelastungEuro(
      input.haushalt,
      answers,
      n,
      mietstufe,
      konstanten.wohngeld,
    );
    if (mEuro === undefined) {
      return {
        system: 'wohngeld',
        berechnungsart: 'bedarfsdeckung',
        voraussetzungenErfuellt: false,
        betragCent: 0,
        imGrenzbereich: false,
        datenluecken: lastenLuecken,
      };
    }

    const yEuro = bereinigtesEinkommenYEuro(
      input.haushalt,
      answers,
      input.zusaetzlichesEinkommenCent,
      n,
      konstanten.wohngeld,
    );

    let wEuro = berechneNachAnlage3(Math.min(n, 12), mEuro, yEuro);
    if (n > 12) {
      wEuro = Math.min(wEuro + konstanten.wohngeld.zuschlagUeber12Euro * (n - 12), mEuro);
    }
    if (wEuro < 0) wEuro = 0;

    const bagatelle = konstanten.wohngeld.bagatellgrenzeEuro;
    const unterBagatelle = wEuro > 0 && wEuro < bagatelle;
    const betragEuro = wEuro >= bagatelle ? wEuro : 0;

    return {
      system: 'wohngeld',
      berechnungsart: 'bedarfsdeckung',
      voraussetzungenErfuellt: betragEuro > 0,
      betragCent: euroNachCent(betragEuro),
      bedarfCent: euroNachCent(mEuro),
      anrechenbaresEinkommenCent: euroNachCent(yEuro),
      bedarfslueckeCent: euroNachCent(betragEuro),
      imGrenzbereich: unterBagatelle,
      datenluecken: [],
    };
  },
};

/** Für Konsistenztests: Höchstbetrag öffentlich. */
export { hoechstbetragEuro };
