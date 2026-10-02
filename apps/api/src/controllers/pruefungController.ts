import type { Request, Response } from 'express';
import type { PruefungRequest } from '@eligibility/shared';
import { gemeindenZuPlz, listeRechtsstaende, pruefeHaushalt } from '../services/pruefungService.js';
import { logger } from '../middlewares/logger.js';

export function postPruefung(req: Request, res: Response): void {
  const body = req.body as PruefungRequest;
  const response = pruefeHaushalt(body);
  logger.info({
    pfad: '/api/v1/pruefung',
    module: response.ergebnisse.map((e) => ({ system: e.system, status: e.eligible })),
    rechtsstand: response.rechtsstandVersion,
  });
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(response);
}

export function getRechtsstaende(_req: Request, res: Response): void {
  const heute = new Date().toISOString().slice(0, 10);
  res.json(listeRechtsstaende(heute));
}

export function getGemeinden(req: Request, res: Response): void {
  const plz = String(req.query.plz ?? '');
  if (!/^\d{5}$/.test(plz)) {
    res.status(422).type('application/problem+json').json({
      type: '/probleme/validierung',
      title: 'Eingabe unvollstaendig',
      status: 422,
      detail: '5 Ziffern erwartet',
      felder: { plz: '5 Ziffern erwartet' },
    });
    return;
  }
  res.json(gemeindenZuPlz(plz));
}
