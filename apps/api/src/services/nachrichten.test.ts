import { describe, expect, it } from 'vitest';
import { brief, logNachrichten, smtpAusEnv } from './nachrichten.js';

describe('Nachrichten', () => {
  it('schreibt den Link in den Brief und nicht in den Betreff', () => {
    const link = 'http://localhost:5173/konto?bestaetigen=geheim';
    const mail = brief({ art: 'email-bestaetigung', email: 'a@b.de', link });
    expect(mail.subject).toBe('E-Mail-Adresse bestätigen');
    expect(mail.text).toContain(link);
    expect(mail.subject).not.toContain('geheim');
  });

  it('versendet ohne SMTP nicht', async () => {
    await expect(logNachrichten()({ art: 'passwort-reset', email: 'a@b.de', link: 'x' })).resolves.toBe(false);
    expect(smtpAusEnv({ SMTP_PORT: 587 })).toBeNull();
    expect(
      smtpAusEnv({
        SMTP_HOST: 'mail.example',
        SMTP_PORT: 587,
        SMTP_USER: 'u',
        SMTP_PASS: 'p',
        MAIL_FROM: 'a@b.de',
      })?.host,
    ).toBe('mail.example');
  });
});