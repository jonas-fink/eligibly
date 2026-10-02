import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

/** Eine Instanz. Bei horizontaler Skalierung gemeinsamen Speicher nutzen. */
function problemHandler(title: string): RequestHandler {
  return (_req, res) => {
    res.status(429).type('application/problem+json').json({
      type: '/probleme/rate-limit',
      title,
      status: 429,
    });
  };
}

const basis = {
  standardHeaders: true,
  legacyHeaders: false,
} as const;

export const pruefungLimit = rateLimit({
  ...basis,
  windowMs: 60_000,
  limit: 30,
  handler: problemHandler('Zu viele Pruefungen'),
});

export const anmeldeLimit = rateLimit({
  ...basis,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  handler: problemHandler('Zu viele Anmeldeversuche'),
});

export const resetLimit = rateLimit({
  ...basis,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  handler: problemHandler('Zu viele Zuruecksetzungen'),
});
