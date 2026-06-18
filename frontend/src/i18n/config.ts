'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enAuth from './locales/en/auth.json';
import enHome from './locales/en/home.json';
import enReading from './locales/en/reading.json';
import enJournal from './locales/en/journal.json';
import enLibrary from './locales/en/library.json';
import enProfile from './locales/en/profile.json';
import enSubscription from './locales/en/subscription.json';
import enAdmin from './locales/en/admin.json';

import viCommon from './locales/vi/common.json';
import viNav from './locales/vi/nav.json';
import viAuth from './locales/vi/auth.json';
import viHome from './locales/vi/home.json';
import viReading from './locales/vi/reading.json';
import viJournal from './locales/vi/journal.json';
import viLibrary from './locales/vi/library.json';
import viProfile from './locales/vi/profile.json';
import viSubscription from './locales/vi/subscription.json';
import viAdmin from './locales/vi/admin.json';

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: {
          common: enCommon,
          nav: enNav,
          auth: enAuth,
          home: enHome,
          reading: enReading,
          journal: enJournal,
          library: enLibrary,
          profile: enProfile,
          subscription: enSubscription,
          admin: enAdmin,
        },
        vi: {
          common: viCommon,
          nav: viNav,
          auth: viAuth,
          home: viHome,
          reading: viReading,
          journal: viJournal,
          library: viLibrary,
          profile: viProfile,
          subscription: viSubscription,
          admin: viAdmin,
        },
      },
      fallbackLng: 'en',
      defaultNS: 'common',
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'arcana-language',
        caches: ['localStorage'],
      },
    });
}

export default i18n;
