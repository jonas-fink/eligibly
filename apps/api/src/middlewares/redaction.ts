export const SENSIBLE_PFADE = [
  'einkommen',
  'vermoegen',
  'vermoegenCent',
  'unterhaltErhalten',
  'unterhaltGezahlt',
  'unterhaltErhaltenCent',
  'unterhaltGezahltCent',
  'kaltmiete',
  'nebenkosten',
  'heizkosten',
  'kaltmieteCent',
  'nebenkostenCent',
  'heizkostenCent',
  'req.body',
  'request.body',
  'err.input',
] as const;

export function redigiereText(text: string, verboteneWerte: string[]): string {
  let out = text;
  for (const wert of verboteneWerte) {
    if (!wert || wert.length < 2) continue;
    out = out.split(wert).join('[redacted]');
  }
  return out;
}

export function enthaeltSensiblenWert(text: string, verboteneWerte: string[]): boolean {
  return verboteneWerte.some((w) => w.length >= 2 && text.includes(w));
}
