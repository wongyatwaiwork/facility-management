import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { de, en, zhHK } from './resources';

const stored = localStorage.getItem('musterwerk-locale') ?? 'en';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'de-DE': { translation: de },
    'zh-HK': { translation: zhHK },
  },
  lng: stored,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
