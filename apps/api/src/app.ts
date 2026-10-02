import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { erstelleV1Router, type RouterKonfig } from './routes/index.js';
import { errorHandler } from './middlewares/index.js';
import { logNachrichten } from './services/nachrichten.js';

export interface AppKonfig {
  clientUrl: string;
  encryptionKey: Buffer;
  keyVersion: number;
  nodeEnv: 'development' | 'test' | 'production';
  nachrichten?: RouterKonfig['nachrichten'];
}

export function createApp(konfig: AppKonfig) {
  const app = express();
  app.use(cors({ origin: konfig.clientUrl, credentials: true }));
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(
    '/api/v1',
    erstelleV1Router({
      clientUrl: konfig.clientUrl,
      encryptionKey: konfig.encryptionKey,
      keyVersion: konfig.keyVersion,
      nodeEnv: konfig.nodeEnv,
      nachrichten: konfig.nachrichten ?? logNachrichten(),
    }),
  );
  app.use(errorHandler);
  return app;
}
