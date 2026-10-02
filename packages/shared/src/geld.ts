import { z } from 'zod';

/** Nutzereingabe in Euro → ganzzahlige Cent an der Systemgrenze. */
export const EuroNachCentSchema = z
  .number()
  .finite()
  .nonnegative()
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, {
    message: 'Hoechstens 2 Nachkommastellen',
  })
  .transform((n) => Math.round(n * 100));

export type BetragCent = number;

export function centNachEuro(betragCent: number): number {
  return betragCent / 100;
}
