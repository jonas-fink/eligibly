/**
 * Unterhaltsvorschuss 2026.
 * Mindestunterhalt: § 1 MinUhV (01.01.2026). Zahlbetrag = Mindestunterhalt − volles Kindergeld (§ 2 UhVorschG).
 * Die Zahlbeträge 227 / 299 / 394 € sind das Ergebnis, nicht die Konstanten.
 */
export interface UnterhaltsvorschussKonstanten {
  mindestunterhalt0bis5Cent: number;
  mindestunterhalt6bis11Cent: number;
  mindestunterhalt12bis17Cent: number;
  altersgrenzeJahre: number;
  mindesteinkommenAb12Cent: number;
}

export const unterhaltsvorschussKonstanten202601: UnterhaltsvorschussKonstanten = {
  mindestunterhalt0bis5Cent: 48_600,
  mindestunterhalt6bis11Cent: 55_800,
  mindestunterhalt12bis17Cent: 65_300,
  altersgrenzeJahre: 18,
  mindesteinkommenAb12Cent: 60_000,
};
