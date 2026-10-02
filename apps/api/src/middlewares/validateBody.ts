import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { HttpFehler } from './errorHandler.js';

export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const felder: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const pfad = issue.path.join('.') || 'body';
        felder[pfad] = issue.message;
      }
      next(
        new HttpFehler(
          422,
          '/probleme/validierung',
          'Eingabe unvollstaendig',
          felder,
        ),
      );
      return;
    }
    req.body = result.data;
    next();
  };

