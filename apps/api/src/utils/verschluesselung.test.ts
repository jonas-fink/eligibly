import { describe, expect, it } from 'vitest';
import { entschluesseln, verschluesseln } from './verschluesselung.js';

const schluessel = Buffer.alloc(32, 9);

describe('Feldverschluesselung', () => {
  it('rundet einen Haushalt und verbirgt das Einkommen', () => {
    const klartext = JSON.stringify({ einkommen: 250050 });
    const chiffre = verschluesseln(klartext, schluessel, 1);
    expect(chiffre.startsWith('v1:1:')).toBe(true);
    expect(chiffre).not.toContain('250050');
    expect(entschluesseln(chiffre, schluessel)).toBe(klartext);
  });

  it('lehnt ein veraendertes Chiffrat ab', () => {
    const chiffre = verschluesseln('geheim', schluessel, 1);
    const teile = chiffre.split(':');
    teile[4] = Buffer.from('manipuliert').toString('base64');
    expect(() => entschluesseln(teile.join(':'), schluessel)).toThrow();
  });
});
