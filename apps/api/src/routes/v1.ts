import { Router } from 'express';
import {
  AnmeldungRequestSchema,
  EmailBestaetigenRequestSchema,
  HaushaltAktualisierenRequestSchema,
  HaushaltSpeichernRequestSchema,
  PasswortVergessenRequestSchema,
  PasswortZuruecksetzenRequestSchema,
  PruefungRequestSchema,
  RegistrierungRequestSchema,
} from '@eligibility/shared';
import { anmeldeLimit, pruefungLimit, resetLimit, validateBody } from '../middlewares/index.js';
import { getGemeinden, getRechtsstaende, postPruefung } from '../controllers/pruefungController.js';
import {
  deleteKonto,
  getKonto,
  postAbmeldung,
  postAnmeldung,
  postEmailBestaetigen,
  postEmailErneut,
  postErneuern,
  postPasswortVergessen,
  postPasswortZuruecksetzen,
  postRegistrierung,
} from '../controllers/authController.js';
import {
  deleteHaushalt,
  getHaushalt,
  getHaushalte,
  postHaushalt,
  putHaushalt,
} from '../controllers/haushaltController.js';
import type { AuthKonfig } from '../services/authService.js';
import type { SpeicherKonfig } from '../services/haushaltService.js';

export interface RouterKonfig extends AuthKonfig, SpeicherKonfig {}

export function erstelleV1Router(konfig: RouterKonfig): Router {
  const router = Router();
  const speicher: SpeicherKonfig = {
    encryptionKey: konfig.encryptionKey,
    keyVersion: konfig.keyVersion,
  };

  router.post('/pruefung', pruefungLimit, validateBody(PruefungRequestSchema), postPruefung);
  router.get('/referenz/rechtsstaende', getRechtsstaende);
  router.get('/referenz/gemeinden', getGemeinden);

  router.post('/auth/registrierung', anmeldeLimit, validateBody(RegistrierungRequestSchema), postRegistrierung(konfig));
  router.post('/auth/anmeldung', anmeldeLimit, validateBody(AnmeldungRequestSchema), postAnmeldung(konfig));
  router.post('/auth/abmeldung', postAbmeldung(konfig));
  router.post('/auth/erneuern', postErneuern(konfig));
  router.post(
    '/auth/passwort-vergessen',
    resetLimit,
    validateBody(PasswortVergessenRequestSchema),
    postPasswortVergessen(konfig),
  );
  router.post(
    '/auth/passwort-zuruecksetzen',
    validateBody(PasswortZuruecksetzenRequestSchema),
    postPasswortZuruecksetzen(),
  );
  router.post('/auth/email-bestaetigen', validateBody(EmailBestaetigenRequestSchema), postEmailBestaetigen());
  router.post('/auth/email-erneut', resetLimit, postEmailErneut(konfig));

  router.get('/konto', getKonto(konfig));
  router.delete('/konto', deleteKonto(konfig));

  router.get('/haushalte', getHaushalte(konfig.encryptionKey, speicher));
  router.post('/haushalte', validateBody(HaushaltSpeichernRequestSchema), postHaushalt(konfig.encryptionKey, speicher));
  router.get('/haushalte/:id', getHaushalt(konfig.encryptionKey, speicher));
  router.put(
    '/haushalte/:id',
    validateBody(HaushaltAktualisierenRequestSchema),
    putHaushalt(konfig.encryptionKey, speicher),
  );
  router.delete('/haushalte/:id', deleteHaushalt(konfig.encryptionKey));

  return router;
}
