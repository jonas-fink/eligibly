import {
  PruefungResponseSchema,
  GemeindenResponseSchema,
  RechtsstaendeResponseSchema,
  KontoAntwortSchema,
  HaushaltListeSchema,
  type GemeindenResponse,
  type HaushaltSpeichernRequest,
  type KontoAntwort,
  type PruefungRequest,
  type PruefungResponse,
} from '@eligibility/shared';

const API_BASIS = '/api/v1';

async function parseJson(res: Response): Promise<unknown> {
  return res.json() as Promise<unknown>;
}

export async function sendePruefung(request: PruefungRequest): Promise<PruefungResponse> {
  const res = await fetch(`${API_BASIS}/pruefung`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error('pruefung_fehlgeschlagen');
  }
  return PruefungResponseSchema.parse(json);
}

export async function ladeRechtsstaende() {
  const res = await fetch(`${API_BASIS}/referenz/rechtsstaende`);
  const json = await parseJson(res);
  return RechtsstaendeResponseSchema.parse(json);
}

async function sende(pfad: string, methode: string, body?: unknown): Promise<Response> {
  return fetch(`${API_BASIS}${pfad}`, {
    method: methode,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function ladeKonto(): Promise<KontoAntwort | null> {
  const res = await sende('/konto', 'GET');
  if (res.status === 401) return null;
  const json = await parseJson(res);
  if (!res.ok) throw new Error('konto_fehlgeschlagen');
  return KontoAntwortSchema.parse(json);
}

export async function registriere(email: string, passwort: string): Promise<KontoAntwort> {
  const res = await sende('/auth/registrierung', 'POST', { email, passwort });
  const json = (await parseJson(res)) as { title?: string };
  if (!res.ok) throw new Error(json.title ?? 'registrierung_fehlgeschlagen');
  return KontoAntwortSchema.parse(json);
}

export async function meldeAn(email: string, passwort: string): Promise<KontoAntwort> {
  const res = await sende('/auth/anmeldung', 'POST', { email, passwort });
  const json = (await parseJson(res)) as { title?: string };
  if (!res.ok) throw new Error(json.title ?? 'anmeldung_fehlgeschlagen');
  return KontoAntwortSchema.parse(json);
}

export async function meldeAb(): Promise<void> {
  const res = await sende('/auth/abmeldung', 'POST');
  if (!res.ok && res.status !== 204) throw new Error('abmeldung_fehlgeschlagen');
}

export async function emailErneut(): Promise<void> {
  const res = await sende('/auth/email-erneut', 'POST');
  if (!res.ok) {
    const json = (await parseJson(res)) as { title?: string };
    throw new Error(json.title ?? 'bestaetigung_fehlgeschlagen');
  }
}

export async function bestaetigeEmail(token: string): Promise<void> {
  const res = await sende('/auth/email-bestaetigen', 'POST', { token });
  if (!res.ok) throw new Error('bestaetigung_fehlgeschlagen');
}

export async function passwortVergessen(email: string): Promise<void> {
  const res = await sende('/auth/passwort-vergessen', 'POST', { email });
  if (!res.ok) throw new Error('reset_fehlgeschlagen');
}

export async function passwortZuruecksetzen(token: string, passwort: string): Promise<void> {
  const res = await sende('/auth/passwort-zuruecksetzen', 'POST', { token, passwort });
  if (!res.ok) throw new Error('reset_fehlgeschlagen');
}

export async function loescheKonto(): Promise<void> {
  const res = await sende('/konto', 'DELETE');
  if (!res.ok && res.status !== 204) throw new Error('loeschung_fehlgeschlagen');
}

export async function speichereHaushalt(body: HaushaltSpeichernRequest): Promise<string> {
  const res = await sende('/haushalte', 'POST', body);
  const json = (await parseJson(res)) as { id?: string; title?: string };
  if (!res.ok) throw new Error(json.title ?? 'speichern_fehlgeschlagen');
  if (!json.id) throw new Error('speichern_fehlgeschlagen');
  return json.id;
}

export async function ladeHaushalte() {
  const res = await sende('/haushalte', 'GET');
  const json = await parseJson(res);
  if (!res.ok) throw new Error('haushalte_fehlgeschlagen');
  return HaushaltListeSchema.parse(json).haushalte;
}

export async function loescheHaushalt(id: string): Promise<void> {
  const res = await sende(`/haushalte/${encodeURIComponent(id)}`, 'DELETE');
  if (!res.ok && res.status !== 204) throw new Error('loeschung_fehlgeschlagen');
}

export async function ladeGemeinden(plz: string): Promise<GemeindenResponse> {
  const res = await fetch(`${API_BASIS}/referenz/gemeinden?plz=${encodeURIComponent(plz)}`);
  const json = await parseJson(res);
  if (!res.ok) {
    throw new Error('gemeinden_fehlgeschlagen');
  }
  return GemeindenResponseSchema.parse(json);
}
