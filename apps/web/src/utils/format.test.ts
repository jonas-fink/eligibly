import { describe, expect, it } from 'vitest';
import { formatiereEuroCent } from './format.ts';

describe('formatiereEuroCent', () => {
  it('formatiert Cent als Euro', () => {
    expect(formatiereEuroCent(130000)).toMatch(/1\.300,00/);
  });
});
