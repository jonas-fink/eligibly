export type Ags = string;

export type Mietstufe = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ReferenzdatenPort {
  agsFuerPlz(plz: string): readonly Ags[];
  mietstufeFuerAgs(ags: Ags): Mietstufe | undefined;
}

export function fakeReferenzdaten(
  eintraege: { plz: string; ags: Ags; mietstufe: Mietstufe }[],
): ReferenzdatenPort {
  const plzMap = new Map<string, Ags[]>();
  const mietMap = new Map<Ags, Mietstufe>();
  for (const e of eintraege) {
    const liste = plzMap.get(e.plz) ?? [];
    liste.push(e.ags);
    plzMap.set(e.plz, liste);
    mietMap.set(e.ags, e.mietstufe);
  }
  return {
    agsFuerPlz: (plz) => plzMap.get(plz) ?? [],
    mietstufeFuerAgs: (ags) => mietMap.get(ags),
  };
}
