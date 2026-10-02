import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { enthaeltSensiblenWert } from './middlewares/redaction.js';

const app = createApp({
  clientUrl: 'http://localhost:5173',
  encryptionKey: Buffer.alloc(32, 7),
  keyVersion: 1,
  nodeEnv: 'test',
});

const payload = {
  haushalt: {
    id: 'h-test',
    erstelltAm: '2026-09-09',
    pruefungsStichtag: '2026-09-09',
    rechtsstandVersion: '2026-01',
    mitglieder: [
      {
        id: 'p1',
        geburtsdatum: '1990-05-05',
        istHauptantragsteller: true,
        istPartnerDesHauptantragstellers: false,
        istKind: false,
        erwerbsstatusPrimaer: 'angestellt',
        isEmployed: true,
        isSelfEmployed: false,
        isStudent: false,
        isRetired: false,
        isUnemployed: false,
        hasDisability: false,
        einkommen: {
          bruttoMonatlichCent: 2500.5,
          nettoMonatlichCent: 1800,
          arten: {
            erwerbstaetigkeitCent: 2500.5,
            renteCent: 0,
            kapitalertraegeCent: 0,
            sonstigeCent: 0,
          },
        },
        vermoegenCent: 1234.56,
        unterhaltErhaltenCent: 0,
      },
    ],
    wohnsituation: {
      plz: '10115',
      wohnort: 'Berlin',
      bundesland: 'BE',
      wohnverhaeltnis: 'miete',
      kaltmieteCent: 890.12,
      nebenkostenCent: 120,
      heizkostenCent: 70,
      wohnflaecheQm: 48,
    },
  },
  interessierendeSysteme: ['elterngeld'],
};

describe('POST /api/v1/pruefung', () => {
  it('liefert Ergebnisse ohne zu speichern', async () => {
    const res = await request(app).post('/api/v1/pruefung').send(payload);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.rechtsstandVersion).toBe('2026-01');
    expect(res.body.ergebnisse.length).toBeGreaterThan(0);
  });

  it('schreibt keine sensiblen Werte in den Log-Strom', async () => {
    const chunks: string[] = [];
    const dest = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(String(chunk));
        cb();
      },
    });
    void dest;
    const verboten = ['2500.5', '1800', '1234.56', '890.12', '10115'];
    const res = await request(app).post('/api/v1/pruefung').send(payload);
    expect(res.status).toBe(200);
    const log = chunks.join('');
    expect(enthaeltSensiblenWert(JSON.stringify(res.body), ['request.body'])).toBe(false);
    for (const wert of verboten) {
      expect(log.includes(wert)).toBe(false);
    }
  });

  it('lehnt ungueltige PLZ mit problem+json ab', async () => {
    const res = await request(app)
      .post('/api/v1/pruefung')
      .send({
        ...payload,
        haushalt: {
          ...payload.haushalt,
          wohnsituation: { ...payload.haushalt.wohnsituation, plz: '12' },
        },
      });
    expect(res.status).toBe(422);
    expect(res.body.type).toBe('/probleme/validierung');
    expect(JSON.stringify(res.body)).not.toContain("'12'");
  });
});

describe('GET /api/v1/referenz/rechtsstaende', () => {
  it('listet Konstanten-Sets', async () => {
    const res = await request(app).get('/api/v1/referenz/rechtsstaende');
    expect(res.status).toBe(200);
    expect(res.body.staende[0].version).toBe('2026-01');
  });
});
