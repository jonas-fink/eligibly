import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Ags, Mietstufe, ReferenzdatenPort } from '@eligibility/eligibility';

const hier = dirname(fileURLToPath(import.meta.url));
const artefaktWurzel = join(hier, '../../../../data/artifacts');

function ladeJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(artefaktWurzel, name), 'utf8')) as T;
}

export interface ReferenzdatenBundle extends ReferenzdatenPort {
  gemeindeNameFuerAgs(ags: Ags): string | undefined;
}

export function ladeReferenzdatenAusArtefakten(): ReferenzdatenBundle {
  const plzAgs = ladeJson<Record<string, string[]>>('plz-ags.json');
  const agsMiet = ladeJson<Record<string, number>>('ags-mietstufe.json');
  const agsName = ladeJson<Record<string, string>>('ags-name.json');

  return {
    agsFuerPlz: (plz) => plzAgs[plz] ?? [],
    mietstufeFuerAgs: (ags) => {
      const v = agsMiet[ags];
      return v === undefined ? undefined : (v as Mietstufe);
    },
    gemeindeNameFuerAgs: (ags) => agsName[ags],
  };
}
