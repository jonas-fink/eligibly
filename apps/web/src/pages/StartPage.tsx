import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export function StartPage() {
  const { t } = useTranslation();
  return (
    <main className="flex flex-1 flex-col justify-center gap-6 py-12">
      <h1 className="text-3xl">{t('start.titel')}</h1>
      <p className="text-lg text-ink-soft">{t('start.text')}</p>
      <Link to="/pruefung" className="btn btn-primaer btn-gross w-fit">
        {t('start.starten')}
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </main>
  );
}
