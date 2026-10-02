import pino from 'pino';
import { SENSIBLE_PFADE } from './redaction.js';

export function erstelleLogger(destination?: pino.DestinationStream) {
  return pino(
    {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
      redact: {
        paths: [...SENSIBLE_PFADE],
        remove: true,
      },
    },
    destination,
  );
}

export const logger = erstelleLogger();
