import type { RequestHandler } from 'express';
import type { AuthKonfig } from '../services/authService.js';
import * as auth from '../services/authService.js';
import { loescheSitzung, setzeSitzung, COOKIE_ERNEUERUNG, COOKIE_ZUGANG } from '../http/cookies.js';

function noStore(res: { setHeader: (name: string, value: string) => void }): void {
  res.setHeader('Cache-Control', 'no-store');
}

export function postRegistrierung(konfig: AuthKonfig): RequestHandler {
  return async (req, res) => {
    const sitzung = await auth.registriere(req.body.email, req.body.passwort, konfig);
    setzeSitzung(res, konfig.nodeEnv, sitzung.zugang, sitzung.erneuerung);
    noStore(res);
    res.status(201).json({
      email: sitzung.email,
      emailVerifiziert: sitzung.emailVerifiziert,
    });
  };
}

export function postAnmeldung(konfig: AuthKonfig): RequestHandler {
  return async (req, res) => {
    const sitzung = await auth.meldeAn(req.body.email, req.body.passwort, konfig);
    setzeSitzung(res, konfig.nodeEnv, sitzung.zugang, sitzung.erneuerung);
    noStore(res);
    res.json({ email: sitzung.email, emailVerifiziert: sitzung.emailVerifiziert });
  };
}

export function postAbmeldung(konfig: AuthKonfig): RequestHandler {
  return async (req, res) => {
    await auth.meldeAb(req.cookies?.[COOKIE_ERNEUERUNG]);
    loescheSitzung(res, konfig.nodeEnv);
    noStore(res);
    res.status(204).end();
  };
}

export function postErneuern(konfig: AuthKonfig): RequestHandler {
  return async (req, res) => {
    const sitzung = await auth.erneuere(req.cookies?.[COOKIE_ERNEUERUNG], konfig);
    setzeSitzung(res, konfig.nodeEnv, sitzung.zugang, sitzung.erneuerung);
    noStore(res);
    res.json({ email: sitzung.email, emailVerifiziert: sitzung.emailVerifiziert });
  };
}

export function postPasswortVergessen(konfig: AuthKonfig): RequestHandler {
  return async (req, res) => {
    await auth.passwortVergessen(req.body.email, konfig);
    noStore(res);
    res.json({ status: 'gesendet' });
  };
}

export function postPasswortZuruecksetzen(): RequestHandler {
  return async (req, res) => {
    await auth.passwortZuruecksetzen(req.body.token, req.body.passwort);
    noStore(res);
    res.json({ status: 'geaendert' });
  };
}

export function postEmailErneut(konfig: AuthKonfig): RequestHandler {
  return async (req, res) => {
    const userId = auth.userIdAusZugang(req.cookies?.[COOKIE_ZUGANG], konfig.encryptionKey);
    await auth.emailErneut(userId, konfig);
    noStore(res);
    res.json({ status: 'gesendet' });
  };
}

export function postEmailBestaetigen(): RequestHandler {
  return async (req, res) => {
    await auth.bestaetigeEmail(req.body.token);
    noStore(res);
    res.json({ status: 'bestaetigt' });
  };
}

export function getKonto(konfig: AuthKonfig): RequestHandler {
  return async (req, res) => {
    const userId = auth.userIdAusZugang(req.cookies?.[COOKIE_ZUGANG], konfig.encryptionKey);
    const konto = await auth.liesKonto(userId);
    noStore(res);
    res.json(konto);
  };
}

export function deleteKonto(konfig: AuthKonfig): RequestHandler {
  return async (req, res) => {
    const userId = auth.userIdAusZugang(req.cookies?.[COOKIE_ZUGANG], konfig.encryptionKey);
    await auth.loescheKonto(userId);
    await auth.meldeAb(req.cookies?.[COOKIE_ERNEUERUNG]);
    loescheSitzung(res, konfig.nodeEnv);
    noStore(res);
    res.status(204).end();
  };
}
