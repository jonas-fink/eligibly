import { randomUUID } from 'node:crypto';
import { UserModel } from '../models/user.js';
import { RefreshTokenModel } from '../models/refreshToken.js';
import { VerifizierungsTokenModel } from '../models/verifizierungsToken.js';
import { HaushaltModel } from '../models/haushalt.js';
import { PruefungModel } from '../models/pruefung.js';
import { hashePasswort, pruefePasswort } from '../utils/passwort.js';
import {
  EMAIL_TOKEN_MS,
  ERNEUERUNG_MS,
  RESET_TOKEN_MS,
  entscheideRotation,
  hasheGeheimwert,
  leseZugang,
  neuerGeheimwert,
  signiereZugang,
  zugangsSchluessel,
} from '../utils/zugang.js';
import { AnmeldungFehlgeschlagen, KontoExistiert, NichtGefunden, TokenUngueltig } from '../domain/fehler.js';
import type { NachrichtenPort } from './nachrichten.js';

export interface AuthKonfig {
  encryptionKey: Buffer;
  clientUrl: string;
  nachrichten: NachrichtenPort;
  nodeEnv: string;
}

export interface Sitzung {
  userId: string;
  email: string;
  emailVerifiziert: boolean;
  zugang: string;
  erneuerung: string;
}

let dummyHash: Promise<string> | undefined;

function platzhalterHash(): Promise<string> {
  dummyHash ??= hashePasswort('platzhalter-nicht-ein-echtes-passwort');
  return dummyHash;
}

async function legeTokenAn(userId: unknown, art: 'email' | 'reset', dauerMs: number): Promise<string> {
  const token = neuerGeheimwert();
  await VerifizierungsTokenModel.create({
    userId,
    art,
    tokenHash: hasheGeheimwert(token),
    laeuftAbAm: new Date(Date.now() + dauerMs),
  });
  return token;
}

async function oeffneSitzung(userId: string, email: string, emailVerifiziert: boolean): Promise<Sitzung> {
  const erneuerung = neuerGeheimwert();
  await RefreshTokenModel.create({
    userId,
    tokenHash: hasheGeheimwert(erneuerung),
    familieId: randomUUID(),
    laeuftAbAm: new Date(Date.now() + ERNEUERUNG_MS),
  });
  return {
    userId,
    email,
    emailVerifiziert,
    zugang: signiereZugang(userId, schluessel()),
    erneuerung,
  };
}

let aktiverSchluessel: Buffer | undefined;

export function setzeZugangsSchluessel(encryptionKey: Buffer): void {
  aktiverSchluessel = zugangsSchluessel(encryptionKey);
}

function schluessel(): Buffer {
  if (!aktiverSchluessel) throw new Error('Zugangsschluessel fehlt');
  return aktiverSchluessel;
}

export async function registriere(email: string, passwort: string, konfig: AuthKonfig): Promise<Sitzung> {
  setzeZugangsSchluessel(konfig.encryptionKey);
  const passwordHash = await hashePasswort(passwort);
  let user;
  try {
    user = await UserModel.create({
      email,
      emailVerifiziert: false,
      passwordHash,
    });
  } catch (error) {
    if (istDuplikat(error)) throw new KontoExistiert();
    throw error;
  }
  const sitzung = await oeffneSitzung(String(user._id), user.email, false);
  try {
    await sendeBestaetigung(user._id, email, konfig);
  } catch (error) {
    await VerifizierungsTokenModel.deleteMany({ userId: user._id });
    await RefreshTokenModel.deleteMany({ userId: user._id });
    await UserModel.deleteOne({ _id: user._id });
    throw error;
  }
  return sitzung;
}

async function sendeBestaetigung(userId: unknown, email: string, konfig: AuthKonfig): Promise<void> {
  const token = await legeTokenAn(userId, 'email', EMAIL_TOKEN_MS);
  const link = `${konfig.clientUrl}/konto?bestaetigen=${encodeURIComponent(token)}`;
  await konfig.nachrichten({ art: 'email-bestaetigung', email, link });
}

export async function meldeAn(email: string, passwort: string, konfig: AuthKonfig): Promise<Sitzung> {
  setzeZugangsSchluessel(konfig.encryptionKey);
  const user = await UserModel.findOne({ email });
  const hash = user?.passwordHash ?? (await platzhalterHash());
  const ok = await pruefePasswort(hash, passwort);
  if (!user?.passwordHash || !ok) throw new AnmeldungFehlgeschlagen();
  user.zuletztAngemeldet = new Date();
  user.loeschungAngekuendigtAm = undefined;
  await user.save();
  return oeffneSitzung(String(user._id), user.email, user.emailVerifiziert);
}

export async function erneuere(erneuerung: string | undefined, konfig: AuthKonfig): Promise<Sitzung> {
  setzeZugangsSchluessel(konfig.encryptionKey);
  if (!erneuerung) throw new TokenUngueltig();
  const eintrag = await RefreshTokenModel.findOne({ tokenHash: hasheGeheimwert(erneuerung) });
  const entscheid = entscheideRotation(eintrag);
  if (entscheid === 'ungueltig' || !eintrag) throw new TokenUngueltig();
  if (entscheid === 'wiederverwendet') {
    await RefreshTokenModel.updateMany(
      { familieId: eintrag.familieId, widerrufenAm: { $exists: false } },
      { widerrufenAm: new Date() },
    );
    throw new TokenUngueltig();
  }
  if (eintrag.laeuftAbAm.getTime() <= Date.now()) throw new TokenUngueltig();
  eintrag.widerrufenAm = new Date();
  await eintrag.save();
  const user = await UserModel.findById(eintrag.userId);
  if (!user) throw new TokenUngueltig();
  const neu = neuerGeheimwert();
  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hasheGeheimwert(neu),
    familieId: eintrag.familieId,
    laeuftAbAm: new Date(Date.now() + ERNEUERUNG_MS),
  });
  return {
    userId: String(user._id),
    email: user.email,
    emailVerifiziert: user.emailVerifiziert,
    zugang: signiereZugang(String(user._id), schluessel()),
    erneuerung: neu,
  };
}

export async function meldeAb(erneuerung: string | undefined): Promise<void> {
  if (!erneuerung) return;
  await RefreshTokenModel.updateOne(
    { tokenHash: hasheGeheimwert(erneuerung), widerrufenAm: { $exists: false } },
    { widerrufenAm: new Date() },
  );
}

export async function bestaetigeEmail(token: string): Promise<void> {
  const eintrag = await VerifizierungsTokenModel.findOne({
    tokenHash: hasheGeheimwert(token),
    art: 'email',
  });
  if (!eintrag || eintrag.laeuftAbAm.getTime() <= Date.now()) throw new TokenUngueltig();
  if (eintrag.verbrauchtAm) {
    const user = await UserModel.findById(eintrag.userId);
    if (user?.emailVerifiziert) return;
    throw new TokenUngueltig();
  }
  eintrag.verbrauchtAm = new Date();
  await eintrag.save();
  await UserModel.updateOne({ _id: eintrag.userId }, { emailVerifiziert: true });
}

export async function passwortVergessen(email: string, konfig: AuthKonfig): Promise<void> {
  const user = await UserModel.findOne({ email });
  if (!user?.passwordHash) return;
  const token = await legeTokenAn(user._id, 'reset', RESET_TOKEN_MS);
  const link = `${konfig.clientUrl}/konto?zuruecksetzen=${encodeURIComponent(token)}`;
  try {
    await konfig.nachrichten({ art: 'passwort-reset', email, link });
  } catch {
    // Die Antwort bleibt dieselbe, ob die Adresse existiert oder der Versand scheitert.
  }
}

export async function emailErneut(userId: string, konfig: AuthKonfig): Promise<void> {
  const user = await UserModel.findById(userId);
  if (!user) throw new NichtGefunden();
  if (user.emailVerifiziert) return;
  await sendeBestaetigung(user._id, user.email, konfig);
}

export async function passwortZuruecksetzen(token: string, passwort: string): Promise<void> {
  const eintrag = await VerifizierungsTokenModel.findOne({
    tokenHash: hasheGeheimwert(token),
    art: 'reset',
  });
  if (!eintrag || eintrag.verbrauchtAm || eintrag.laeuftAbAm.getTime() <= Date.now()) {
    throw new TokenUngueltig();
  }
  eintrag.verbrauchtAm = new Date();
  await eintrag.save();
  const passwordHash = await hashePasswort(passwort);
  await UserModel.updateOne({ _id: eintrag.userId }, { passwordHash });
  await RefreshTokenModel.updateMany(
    { userId: eintrag.userId, widerrufenAm: { $exists: false } },
    { widerrufenAm: new Date() },
  );
}

export async function liesKonto(userId: string): Promise<{ email: string; emailVerifiziert: boolean }> {
  const user = await UserModel.findById(userId);
  if (!user) throw new NichtGefunden();
  return { email: user.email, emailVerifiziert: user.emailVerifiziert };
}

export function userIdAusZugang(token: string | undefined, encryptionKey: Buffer): string {
  setzeZugangsSchluessel(encryptionKey);
  if (!token) throw new AnmeldungFehlgeschlagen();
  try {
    return leseZugang(token, schluessel());
  } catch {
    throw new AnmeldungFehlgeschlagen();
  }
}

export async function loescheKonto(userId: string): Promise<void> {
  const haushalte = await HaushaltModel.find({ userId }).select('_id');
  const ids = haushalte.map((h) => h._id);
  if (ids.length) await PruefungModel.deleteMany({ haushaltId: { $in: ids } });
  await HaushaltModel.deleteMany({ userId });
  await RefreshTokenModel.deleteMany({ userId });
  await VerifizierungsTokenModel.deleteMany({ userId });
  const geloescht = await UserModel.deleteOne({ _id: userId });
  if (geloescht.deletedCount !== 1) throw new NichtGefunden();
}

function istDuplikat(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
