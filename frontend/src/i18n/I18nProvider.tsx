'use client';

import { ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './config';

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lang = i18n.language?.split('-')[0] || 'en';
    document.documentElement.lang = lang;
  }, [i18n.language]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
