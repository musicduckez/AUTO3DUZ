import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ru } from './ru';
import { uz } from './uz';

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_lang') : null;

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    uz: { translation: uz },
  },
  lng: saved === 'uz' || saved === 'ru' ? saved : 'ru',
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
});

export default i18n;
