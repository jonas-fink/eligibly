import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-auto border-t border-line px-4 py-6 text-sm text-ink-soft">
      <p className="mb-3">{t('footer.sessionHinweis')}</p>
      <nav className="flex gap-4">
        <NavLink to="/datenquellen" className="underline">
          {t('footer.datenquellen')}
        </NavLink>
        <NavLink to="/konto" className="underline">
          {t('footer.konto')}
        </NavLink>
      </nav>
    </footer>
  );
}
