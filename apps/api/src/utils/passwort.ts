import { argon2id, hash, verify, type HashOptions } from 'argon2';

/** Argon2id laut docs/architektur.md 9.1 / OWASP. */
const OPTIONEN: HashOptions = {
  type: argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashePasswort(passwort: string): Promise<string> {
  return hash(passwort, OPTIONEN);
}

export async function pruefePasswort(passwortHash: string, passwort: string): Promise<boolean> {
  return verify(passwortHash, passwort);
}
