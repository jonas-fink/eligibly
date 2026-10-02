import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';

void i18n.use(initReactI18next).init({
  lng: 'de',
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
  resources: { de: { translation: de } },
});

export { i18n };
