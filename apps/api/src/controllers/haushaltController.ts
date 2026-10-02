import type { RequestHandler } from 'express';
import { COOKIE_ZUGANG } from '../http/cookies.js';
import { userIdAusZugang } from '../services/authService.js';
import * as haushalte from '../services/haushaltService.js';
import type { SpeicherKonfig } from '../services/haushaltService.js';

function noStore(res: { setHeader: (name: string, value: string) => void }): void {
  res.setHeader('Cache-Control', 'no-store');
}

function userId(req: { cookies?: Record<string, string> }, encryptionKey: Buffer): string {
  return userIdAusZugang(req.cookies?.[COOKIE_ZUGANG], encryptionKey);
}

export function getHaushalte(encryptionKey: Buffer, konfig: SpeicherKonfig): RequestHandler {
  return async (req, res) => {
    const liste = await haushalte.listeHaushalte(userId(req, encryptionKey), konfig);
    noStore(res);
    res.json({ haushalte: liste });
  };
}

export function postHaushalt(encryptionKey: Buffer, konfig: SpeicherKonfig): RequestHandler {
  return async (req, res) => {
    const angelegt = await haushalte.speichereHaushalt(userId(req, encryptionKey), req.body, konfig);
    noStore(res);
    res.status(201).json(angelegt);
  };
}

export function getHaushalt(encryptionKey: Buffer, konfig: SpeicherKonfig): RequestHandler {
  return async (req, res) => {
    const doc = await haushalte.liesHaushalt(userId(req, encryptionKey), String(req.params.id), konfig);
    noStore(res);
    res.json(doc);
  };
}

export function putHaushalt(encryptionKey: Buffer, konfig: SpeicherKonfig): RequestHandler {
  return async (req, res) => {
    const doc = await haushalte.aktualisiereHaushalt(
      userId(req, encryptionKey),
      String(req.params.id),
      req.body,
      konfig,
    );
    noStore(res);
    res.json(doc);
  };
}

export function deleteHaushalt(encryptionKey: Buffer): RequestHandler {
  return async (req, res) => {
    await haushalte.loescheHaushalt(userId(req, encryptionKey), String(req.params.id));
    noStore(res);
    res.status(204).end();
  };
}
