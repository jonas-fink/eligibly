import { createApp } from './app.js';
import { connectDB, ladeEnv } from './config/index.js';
import { logNachrichten, smtpAusEnv, smtpNachrichten } from './services/nachrichten.js';

const env = ladeEnv();
const app = createApp({
  clientUrl: env.CLIENT_URL,
  encryptionKey: Buffer.from(env.ENCRYPTION_KEY, 'base64'),
  keyVersion: env.AKTUELLE_KEY_VERSION,
  nodeEnv: env.NODE_ENV,
  nachrichten: (() => {
    const smtp = smtpAusEnv(env);
    return smtp ? smtpNachrichten(smtp) : logNachrichten();
  })(),
});

connectDB(env.MONGO_URI).then(() => {
  app.listen(env.PORT, () => {
    console.log(`API auf Port ${env.PORT}`);
  });
});
