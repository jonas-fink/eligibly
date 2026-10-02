import { randomUUID } from 'node:crypto';
import type { ErrorRequestHandler } from 'express';
import { UnbekannterRechtsstand } from '@eligibility/eligibility';
import {
  AnmeldungFehlgeschlagen,
  EmailNichtBestaetigt,
  KontoExistiert,
  MailNichtZugestellt,
  NichtGefunden,
  TokenUngueltig,
} from '../domain/fehler.js';
import { logger } from './logger.js';

export class HttpFehler extends Error {
  readonly status: number;
  readonly type: string;
  readonly felder?: Record<string, string>;

  constructor(status: number, type: string, title: string, felder?: Record<string, string>) {
    super(title);
    this.status = status;
    this.type = type;
    this.felder = felder;
  }
}

function fachlicherStatus(err: unknown): { status: number; type: string; title: string } | null {
  if (err instanceof KontoExistiert) {
    return { status: 409, type: '/probleme/konto', title: 'Ein Konto mit dieser Adresse gibt es bereits' };
  }
  if (err instanceof AnmeldungFehlgeschlagen) {
    return { status: 401, type: '/probleme/anmeldung', title: 'Anmeldung fehlgeschlagen' };
  }
  if (err instanceof EmailNichtBestaetigt) {
    return { status: 403, type: '/probleme/email', title: 'E-Mail noch nicht bestaetigt' };
  }
  if (err instanceof TokenUngueltig) {
    return { status: 400, type: '/probleme/token', title: 'Link ungueltig oder abgelaufen' };
  }
  if (err instanceof MailNichtZugestellt) {
    return { status: 503, type: '/probleme/email-versand', title: 'Die E-Mail konnte nicht zugestellt werden' };
  }
  if (err instanceof NichtGefunden) {
    return { status: 404, type: '/probleme/nicht-gefunden', title: 'Nicht gefunden' };
  }
  return null;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  void next;
  const korrelation = randomUUID().slice(0, 6);

  if (err instanceof UnbekannterRechtsstand) {
    res.status(422).type('application/problem+json').json({
      type: '/probleme/rechtsstand',
      title: 'Rechtsstand unbekannt',
      status: 422,
      detail: err.message,
    });
    return;
  }

  const fachlich = fachlicherStatus(err);
  if (fachlich) {
    res.status(fachlich.status).type('application/problem+json').json({
      type: fachlich.type,
      title: fachlich.title,
      status: fachlich.status,
    });
    return;
  }

  if (err instanceof HttpFehler) {
    res.status(err.status).type('application/problem+json').json({
      type: err.type,
      title: err.message,
      status: err.status,
      ...(err.felder ? { felder: err.felder, detail: Object.values(err.felder)[0] } : {}),
    });
    return;
  }

  logger.error({ korrelation, message: err instanceof Error ? err.message : 'unbekannt' });
  res.status(500).type('application/problem+json').json({
    type: '/probleme/intern',
    title: 'Etwas ist schiefgelaufen.',
    status: 500,
    detail: `Kennung: ${korrelation}`,
  });
};
