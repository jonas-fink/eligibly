import type { CookieOptions, Response } from 'express';

export const COOKIE_ZUGANG = 'zugang';
export const COOKIE_ERNEUERUNG = 'erneuerung';

const ZUGANG_MS = 15 * 60 * 1000;
const ERNEUERUNG_MS = 30 * 24 * 60 * 60 * 1000;

function optionen(nodeEnv: string, maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: 'lax',
    path: '/api',
    maxAge,
  };
}

export function setzeSitzung(res: Response, nodeEnv: string, zugang: string, erneuerung: string): void {
  res.cookie(COOKIE_ZUGANG, zugang, optionen(nodeEnv, ZUGANG_MS));
  res.cookie(COOKIE_ERNEUERUNG, erneuerung, optionen(nodeEnv, ERNEUERUNG_MS));
}

export function loescheSitzung(res: Response, nodeEnv: string): void {
  const opt = optionen(nodeEnv, 0);
  res.clearCookie(COOKIE_ZUGANG, opt);
  res.clearCookie(COOKIE_ERNEUERUNG, opt);
}
