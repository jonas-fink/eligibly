import { createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

const ZUGANG_SEKUNDEN = 15 * 60;
export const ERNEUERUNG_MS = 30 * 24 * 60 * 60 * 1000;
export const EMAIL_TOKEN_MS = 24 * 60 * 60 * 1000;
export const RESET_TOKEN_MS = 60 * 60 * 1000;

export function zugangsSchluessel(encryptionKey: Buffer): Buffer {
  return Buffer.from(hkdfSync('sha256', encryptionKey, Buffer.alloc(0), 'eligibility-zugang', 32));
}

function b64url(wert: Buffer | string): string {
  const buf = typeof wert === 'string' ? Buffer.from(wert) : wert;
  return buf.toString('base64url');
}

export function signiereZugang(userId: string, schluessel: Buffer, jetztMs = Date.now()): string {
  const kopf = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const inhalt = b64url(
    JSON.stringify({ sub: userId, exp: Math.floor(jetztMs / 1000) + ZUGANG_SEKUNDEN }),
  );
  const daten = `${kopf}.${inhalt}`;
  const sig = createHmac('sha256', schluessel).update(daten).digest();
  return `${daten}.${b64url(sig)}`;
}

export function leseZugang(token: string, schluessel: Buffer, jetztMs = Date.now()): string {
  const teile = token.split('.');
  if (teile.length !== 3) throw new Error('token');
  const [kopf, inhalt, sig] = teile as [string, string, string];
  const daten = `${kopf}.${inhalt}`;
  const erwartet = createHmac('sha256', schluessel).update(daten).digest();
  const bekommen = Buffer.from(sig, 'base64url');
  if (erwartet.length !== bekommen.length || !timingSafeEqual(erwartet, bekommen)) {
    throw new Error('signatur');
  }
  const payload = JSON.parse(Buffer.from(inhalt, 'base64url').toString('utf8')) as {
    sub?: string;
    exp?: number;
  };
  if (!payload.sub || !payload.exp || payload.exp * 1000 <= jetztMs) throw new Error('abgelaufen');
  return payload.sub;
}

export function neuerGeheimwert(): string {
  return randomBytes(32).toString('base64url');
}

export function hasheGeheimwert(wert: string): string {
  return createHash('sha256').update(wert).digest('hex');
}

export type Rotation = 'rotieren' | 'ungueltig' | 'wiederverwendet';

export function entscheideRotation(eintrag: { widerrufenAm?: Date | null } | null): Rotation {
  if (!eintrag) return 'ungueltig';
  if (eintrag.widerrufenAm) return 'wiederverwendet';
  return 'rotieren';
}
