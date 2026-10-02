export function formatiereEuroCent(betragCent: number, locale = 'de-DE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(betragCent / 100);
}
