import {
  aktuellerRechtsstand,
  evaluateHaushalt,
  istRechtsstandAktuell,
  ladeKonstanten,
  SETS,
} from '@eligibility/eligibility';
import {
  ergaenzeHaushalt,
  type HaushaltEingabe,
  type PruefungResponse,
  type RechtsstaendeResponse,
  type GemeindenResponse,
  type SystemKey,
} from '@eligibility/shared';
import { ladeReferenzdatenAusArtefakten } from '../config/referenzdaten.js';

const referenz = ladeReferenzdatenAusArtefakten();

export function pruefeHaushalt(eingabe: {
  haushalt: HaushaltEingabe;
  interessierendeSysteme: SystemKey[];
  systemSpecificAnswers?: Record<string, unknown>;
}): PruefungResponse {
  const version = eingabe.haushalt.rechtsstandVersion || aktuellerRechtsstand(eingabe.haushalt.pruefungsStichtag);
  const konstanten = ladeKonstanten(version);
  const haushalt = ergaenzeHaushalt({ ...eingabe.haushalt, rechtsstandVersion: version });
  const alle = evaluateHaushalt(
    haushalt,
    eingabe.interessierendeSysteme,
    eingabe.systemSpecificAnswers,
    konstanten,
    referenz,
  );
  const ergebnisse = eingabe.interessierendeSysteme
    .map((k) => alle[k])
    .concat(
      Object.entries(alle)
        .filter(([k]) => !eingabe.interessierendeSysteme.includes(k as SystemKey))
        .map(([, v]) => v),
    )
    .filter((x) => x !== undefined);

  const eindeutig = new Map(ergebnisse.map((e) => [e.system, e]));
  return {
    ergebnisse: [...eindeutig.values()],
    rechtsstandVersion: konstanten.version,
    rechtsstandAktuell: istRechtsstandAktuell(konstanten.version, haushalt.pruefungsStichtag),
  };
}

export function listeRechtsstaende(stichtag: string): RechtsstaendeResponse {
  return {
    staende: Object.values(SETS).map((s) => ({
      version: s.version,
      gueltigVon: s.gueltigVon,
      gueltigBis: s.gueltigBis,
      aktuell: istRechtsstandAktuell(s.version, stichtag),
    })),
  };
}

export function gemeindenZuPlz(plz: string): GemeindenResponse {
  const agsListe = referenz.agsFuerPlz(plz);
  const gemeinden = agsListe.map((ags) => ({
    ags,
    name: referenz.gemeindeNameFuerAgs(ags) ?? ags,
    mietstufe: referenz.mietstufeFuerAgs(ags),
  }));
  const stufen = new Set(gemeinden.map((g) => g.mietstufe).filter((s) => s !== undefined));
  return {
    plz,
    gemeinden,
    mietstufeEindeutig: stufen.size <= 1,
  };
}
