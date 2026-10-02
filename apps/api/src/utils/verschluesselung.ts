import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** AES-256-GCM. Format: v1:<keyVersion>:<iv>:<tag>:<ciphertext>, alles Base64. */
export function verschluesseln(klartext: string, schluessel: Buffer, keyVersion: number): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', schluessel, iv);
  const geheim = Buffer.concat([cipher.update(klartext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    'v1',
    String(keyVersion),
    iv.toString('base64'),
    tag.toString('base64'),
    geheim.toString('base64'),
  ].join(':');
}

export function entschluesseln(chiffre: string, schluessel: Buffer): string {
  const teile = chiffre.split(':');
  if (teile.length !== 5 || teile[0] !== 'v1') {
    throw new Error('Schluesselformat ungueltig');
  }
  const iv = Buffer.from(teile[2] ?? '', 'base64');
  const tag = Buffer.from(teile[3] ?? '', 'base64');
  const geheim = Buffer.from(teile[4] ?? '', 'base64');
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error('Schluesselformat ungueltig');
  }
  const decipher = createDecipheriv('aes-256-gcm', schluessel, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(geheim), decipher.final()]).toString('utf8');
}
