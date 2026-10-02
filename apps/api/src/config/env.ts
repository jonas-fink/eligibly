import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  CLIENT_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ENCRYPTION_KEY: z.string().min(1, 'ENCRYPTION_KEY fehlt — Prozess startet nicht'),
  AKTUELLE_KEY_VERSION: z.coerce.number().int().positive().default(1),
  /**
   * Atlas-URI. Der Datenbankname wird nicht aus der URI gelesen, sondern fest
   * als `cursorEligibility` gesetzt (siehe config/db.ts).
   */
  MONGO_URI: z.string().min(1, 'MONGO_URI fehlt'),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

function normalisiere(quelle: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { ...quelle };
  const roh = (out.MONGO_URI ?? out.MONGODB_URI ?? '').trim().replace(/^["']|["']$/g, '');
  if (roh) out.MONGO_URI = roh;
  if (out.ENCRYPTION_KEY) {
    out.ENCRYPTION_KEY = out.ENCRYPTION_KEY.trim().replace(/^["']|["']$/g, '');
  }
  if (out.CLIENT_URL) {
    out.CLIENT_URL = out.CLIENT_URL.trim().replace(/^["']|["']$/g, '');
  }
  if (!out.SMTP_PORT?.trim()) delete out.SMTP_PORT;
  for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'] as const) {
    const wert = out[key]?.trim().replace(/^["']|["']$/g, '');
    if (wert) out[key] = wert;
    else delete out[key];
  }
  return out;
}

export function ladeEnv(quelle: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(normalisiere(quelle));
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ');
    throw new Error(
      `Konfiguration ungueltig: ${msg}. ` +
        'Pruefe die Repo-Wurzel `.env`. Atlas-Passwoerter mit Sonderzeichen (#, @, /) muessen URL-kodiert sein ' +
        'oder der ganze Wert in Anfuehrungszeichen stehen.',
    );
  }
  const key = Buffer.from(parsed.data.ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY muss 32 Byte Base64 sein');
  }
  return parsed.data;
}
