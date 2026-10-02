/** Kinderzuschlag 2026. Höchstbetrag bleibt 297 €, weil die Jahresformel unter dem Vorjahreswert liegt. */
export interface KinderzuschlagKonstanten {
  hoechstbetragProKindCent: number;
  mindesteinkommenAlleinerziehendCent: number;
  mindesteinkommenPaarCent: number;
  abschmelzungssatzEltern: number;
  anrechnungssatzKind: number;
  hoechstalterJahre: number;
}

export const kinderzuschlagKonstanten202601: KinderzuschlagKonstanten = {
  hoechstbetragProKindCent: 29_700,
  mindesteinkommenAlleinerziehendCent: 60_000,
  mindesteinkommenPaarCent: 90_000,
  abschmelzungssatzEltern: 0.45,
  anrechnungssatzKind: 0.45,
  hoechstalterJahre: 25,
};
