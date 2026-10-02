import nodemailer from 'nodemailer';
import { logger } from '../middlewares/logger.js';
import { MailNichtZugestellt } from '../domain/fehler.js';

export interface Nachricht {
  art: 'email-bestaetigung' | 'passwort-reset';
  email: string;
  link: string;
}

/** true, wenn die Nachricht einen Postausgang verlassen hat. */
export type NachrichtenPort = (nachricht: Nachricht) => Promise<boolean>;

export interface SmtpKonfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export function brief(nachricht: Nachricht): { subject: string; text: string } {
  if (nachricht.art === 'email-bestaetigung') {
    return {
      subject: 'E-Mail-Adresse bestätigen',
      text: `Bitte bestätige deine Adresse, damit du einen Haushalt speichern kannst:\n\n${nachricht.link}\n\nDer Link gilt 24 Stunden.`,
    };
  }
  return {
    subject: 'Passwort zurücksetzen',
    text: `Hier kannst du ein neues Passwort setzen:\n\n${nachricht.link}\n\nDer Link gilt eine Stunde. Wenn du das nicht warst, ignoriere diese Nachricht.`,
  };
}

/** Ohne SMTP wird nichts verschickt und kein Link geloggt. */
export function logNachrichten(): NachrichtenPort {
  return async (nachricht) => {
    logger.info({ art: nachricht.art, hinweis: 'E-Mail-Versand ist nicht konfiguriert' });
    return false;
  };
}

export function smtpNachrichten(konfig: SmtpKonfig): NachrichtenPort {
  const transport = nodemailer.createTransport({
    host: konfig.host,
    port: konfig.port,
    secure: konfig.port === 465,
    auth: { user: konfig.user, pass: konfig.pass },
  });
  return async (nachricht) => {
    const inhalt = brief(nachricht);
    try {
      await transport.sendMail({
        from: konfig.from,
        to: nachricht.email,
        subject: inhalt.subject,
        text: inhalt.text,
      });
    } catch {
      throw new MailNichtZugestellt();
    }
    logger.info({ art: nachricht.art, hinweis: 'E-Mail versendet' });
    return true;
  };
}

export function smtpAusEnv(env: {
  SMTP_HOST?: string;
  SMTP_PORT: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  MAIL_FROM?: string;
}): SmtpKonfig | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.MAIL_FROM) return null;
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.MAIL_FROM,
  };
}
