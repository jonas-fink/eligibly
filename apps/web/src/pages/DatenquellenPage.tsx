import { useTranslation } from 'react-i18next';

export function DatenquellenPage() {
  const { t } = useTranslation();
  return (
    <main className="flex flex-1 flex-col gap-6 py-8">
      <h1 className="text-3xl">{t('datenquellen.titel')}</h1>
      <p>{t('datenquellen.rechtsstand')}</p>
      <p>{t('datenquellen.mietstufen')}</p>
      <p>
        {t('datenquellen.openplz')}{' '}
        <a className="underline" href="https://www.openplzapi.org/">
          {t('datenquellen.linkOpenplz')}
        </a>
        {' · '}
        <a className="underline" href="https://opendatacommons.org/licenses/odbl/1-0/">
          {t('datenquellen.linkOdbl')}
        </a>
      </p>
    </main>
  );
}
