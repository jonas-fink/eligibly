import {
  KinderzuschlagAnswersSchema,
  alterAm,
  type Haushalt,
  type Haushaltsmitglied,
  type ModuleCalculation,
} from '@eligibility/shared';
import type { KonstantenSet } from '../constants/2026-01.js';
import type { EligibilityInput, Leistungsanteil, RuleModul } from './types.js';
import {
  erwerbstaetigenfreibetragCent,
  regelsatzElternteilCent,
  vermoegensfreibetragCent,
} from './sgb2.js';

export const KINDERZUSCHLAG_NAECHSTE_SCHRITTE = {
  beschreibung: 'Kinderzuschlag wird zusammen mit oder zusätzlich zum Kindergeld bei der Familienkasse beantragt.',
  benoetigteUnterlagen: [
    'Kindergeldbescheid',
    'Einkommensnachweise der Eltern',
    'Nachweis über Unterhalt oder Unterhaltsvorschuss, falls das Kind eigenes Einkommen hat',
    'Mietvertrag oder Nebenkostenabrechnung',
  ],
  zustaendigeStelle: 'Familienkasse der Bundesagentur für Arbeit.',
};

function leer(datenluecken: string[]): ModuleCalculation {
  return {
    system: 'kinderzuschlag',
    berechnungsart: 'bedarfsdeckung',
    voraussetzungenErfuellt: false,
    betragCent: 0,
    imGrenzbereich: false,
    datenluecken,
  };
}

function prozentCent(betragCent: number, satz: number): number {
  return Math.round((betragCent * Math.round(satz * 100)) / 100);
}

function elternVon(haushalt: Haushalt): Haushaltsmitglied[] {
  return haushalt.mitglieder.filter((m) => m.istHauptantragsteller || m.istPartnerDesHauptantragstellers);
}

function uvgFuerKind(personId: string, kinderIds: string[], leistung: Leistungsanteil | undefined): number {
  if (!leistung || leistung.betragCent <= 0) return 0;
  const teil = leistung.teilbetraege?.find((t) => t.personId === personId);
  if (teil) return teil.betragCent;
  if (leistung.teilbetraege && leistung.teilbetraege.length > 0) return 0;
  if (kinderIds.length === 1) return leistung.betragCent;
  const basis = Math.floor(leistung.betragCent / kinderIds.length);
  const rest = leistung.betragCent - basis * kinderIds.length;
  return basis + (kinderIds[0] === personId ? rest : 0);
}

function verteile(gesamtCent: number, anteile: { personId: string; gewichtCent: number }[]): ModuleCalculation['teilbetraege'] {
  const summe = anteile.reduce((s, a) => s + a.gewichtCent, 0);
  if (gesamtCent <= 0 || summe <= 0) return undefined;
  let verteilt = 0;
  const teile = anteile.map((a, index) => {
    const betragCent =
      index === anteile.length - 1 ? gesamtCent - verteilt : Math.floor((gesamtCent * a.gewichtCent) / summe);
    verteilt += betragCent;
    return { personId: a.personId, betragCent, hinweis: 'Kinderzuschlag' };
  });
  return teile.filter((t) => t.betragCent > 0);
}

export const kinderzuschlagRegel: RuleModul = {
  system: 'kinderzuschlag',
  calculate(input: EligibilityInput, konstanten: KonstantenSet): ModuleCalculation {
    const { haushalt } = input;
    const k = konstanten.kinderzuschlag;
    const eltern = elternVon(haushalt);
    const kinder = haushalt.mitglieder.filter(
      (m) => m.istKind && alterAm(m.geburtsdatum, haushalt.pruefungsStichtag) < k.hoechstalterJahre,
    );
    if (kinder.length === 0 || eltern.length === 0) return leer([]);

    const ungeklärt = kinder.some((kind) => kind.kindergeldWirdBezogen === undefined);
    const mitKindergeld = kinder.filter((kind) => kind.kindergeldWirdBezogen === true);
    if (mitKindergeld.length === 0) {
      return ungeklärt ? leer(['Kindergeldbezug nicht angegeben']) : leer([]);
    }

    const parsed = KinderzuschlagAnswersSchema.safeParse(input.systemSpecificAnswers?.['kinderzuschlag'] ?? {});
    if (!parsed.success) return leer(['Angaben zum Kinderzuschlag unvollständig']);

    const bruttoEltern = eltern.reduce((s, m) => s + m.einkommen.bruttoMonatlichCent, 0);
    const mindest =
      haushalt.haushaltstyp === 'alleinerziehend'
        ? k.mindesteinkommenAlleinerziehendCent
        : k.mindesteinkommenPaarCent;
    const vermoegenFrei = haushalt.mitglieder.reduce(
      (s, m) => s + vermoegensfreibetragCent(alterAm(m.geburtsdatum, haushalt.pruefungsStichtag)),
      0,
    );
    const vermoegenOk = haushalt.vermoegenGesamtCent <= vermoegenFrei;
    const mindestOk = bruttoEltern >= mindest;
    if (!mindestOk || !vermoegenOk) return leer([]);

    const lebtMitPartner = eltern.some((m) => m.istPartnerDesHauptantragstellers);
    const minderjaehrig = kinder.some((kind) => alterAm(kind.geburtsdatum, haushalt.pruefungsStichtag) < 18);
    const elternRegelbedarf = eltern.length * regelsatzElternteilCent(lebtMitPartner);
    const elternKdU = Math.round((haushalt.warmmieteCent * eltern.length) / haushalt.anzahlPersonen);
    const elternBedarf = elternRegelbedarf + elternKdU;

    const freibetrag = eltern.reduce(
      (s, m) => s + erwerbstaetigenfreibetragCent(m.einkommen.arten.erwerbstaetigkeitCent, minderjaehrig),
      0,
    );
    const netto = eltern.reduce((s, m) => s + m.einkommen.nettoMonatlichCent, 0);
    const ueberschuss = Math.max(0, netto - freibetrag - elternBedarf);
    const abschmelzung = prozentCent(ueberschuss, k.abschmelzungssatzEltern);

    const uvg = input.zusaetzlicheLeistungen?.['unterhaltsvorschuss'];
    const uvgSumme = input.zusaetzlichesEinkommenCent?.['unterhaltsvorschuss'] ?? uvg?.betragCent ?? 0;
    const uvgLeistung: Leistungsanteil | undefined =
      uvg ?? (uvgSumme > 0 ? { betragCent: uvgSumme } : undefined);
    const ids = mitKindergeld.map((kind) => kind.id);
    const extraGesamt = parsed.data.kindEinkommenMonatlichCent ?? 0;
    const extraBasis = ids.length > 0 ? Math.floor(extraGesamt / ids.length) : 0;
    const extraRest = extraGesamt - extraBasis * ids.length;

    const anteile = mitKindergeld.map((kind, index) => {
      const eigen =
        kind.einkommen.bruttoMonatlichCent +
        (kind.unterhaltErhaltenCent ?? 0) +
        uvgFuerKind(kind.id, ids, uvgLeistung) +
        extraBasis +
        (index === 0 ? extraRest : 0);
      const gewichtCent = Math.max(0, k.hoechstbetragProKindCent - prozentCent(eigen, k.anrechnungssatzKind));
      return { personId: kind.id, gewichtCent };
    });

    const summe = anteile.reduce((s, a) => s + a.gewichtCent, 0);
    const betragCent = Math.max(0, summe - abschmelzung);
    return {
      system: 'kinderzuschlag',
      berechnungsart: 'bedarfsdeckung',
      voraussetzungenErfuellt: betragCent > 0,
      betragCent,
      imGrenzbereich: false,
      datenluecken: [],
      teilbetraege: verteile(betragCent, anteile),
    };
  },
};
