import { describe, expect, it } from 'vitest';
import { entscheideRotation, leseZugang, signiereZugang, zugangsSchluessel } from './zugang.js';

const schluessel = zugangsSchluessel(Buffer.alloc(32, 3));

describe('Zugang', () => {
  it('liest eine frische Signatur', () => {
    const token = signiereZugang('user-1', schluessel, 1_000);
    expect(leseZugang(token, schluessel, 1_000)).toBe('user-1');
  });

  it('lehnt ein abgelaufenes Token ab', () => {
    const token = signiereZugang('user-1', schluessel, 0);
    expect(() => leseZugang(token, schluessel, 20 * 60 * 1000)).toThrow();
  });

  it('erkennt wiederverwendete Refresh-Tokens', () => {
    expect(entscheideRotation(null)).toBe('ungueltig');
    expect(entscheideRotation({ widerrufenAm: null })).toBe('rotieren');
    expect(entscheideRotation({ widerrufenAm: new Date() })).toBe('wiederverwendet');
  });
});