/**
 * Gemeinsame SGB-II-Bausteine für Kinderzuschlag und die Neue Grundsicherung.
 * Eine Implementierung, zwei Aufrufer — siehe kinderzuschlag.md Abschnitt 6 und buergergeld.md 4.2.
 */

/** § 12 SGB II, altersgestaffelt, ab 01.07.2026. Grenzen: bis 29 / 30–40 / 41–50 / ab 51. */
export function vermoegensfreibetragCent(alterJahre: number): number {
  if (alterJahre <= 29) return 500_000;
  if (alterJahre <= 40) return 1_000_000;
  if (alterJahre <= 50) return 1_250_000;
  return 2_000_000;
}

/**
 * § 11b SGB II auf das Brutto-Erwerbseinkommen einer Person.
 * Mit minderjährigem Kind endet die 10-%-Stufe bei 1.500 €, sonst bei 1.200 €.
 */
export function erwerbstaetigenfreibetragCent(erwerbBruttoCent: number, mitMinderjaehrigemKind: boolean): number {
  if (erwerbBruttoCent <= 0) return 0;
  const bis = (obergrenzeCent: number, vonCent: number, prozent: number): number => {
    const band = Math.min(erwerbBruttoCent, obergrenzeCent) - vonCent;
    if (band <= 0) return 0;
    return Math.round((band * prozent) / 100);
  };
  const grund = Math.min(erwerbBruttoCent, 10_000);
  const stufe100 = bis(52_000, 10_000, 20);
  const stufe520 = bis(100_000, 52_000, 30);
  const deckel = mitMinderjaehrigemKind ? 150_000 : 120_000;
  const stufe1000 = bis(deckel, 100_000, 10);
  return grund + stufe100 + stufe520 + stufe1000;
}

/** Regelsatz der Eltern: Stufe 1 allein, Stufe 2 je Partner. Nullrunde 2026, Stand wie 2024/2025. */
export function regelsatzElternteilCent(lebtMitPartner: boolean): number {
  return lebtMitPartner ? 50_600 : 56_300;
}
