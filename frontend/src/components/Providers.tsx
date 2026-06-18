'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { I18nProvider } from '@/i18n/I18nProvider';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <I18nProvider>
            <ThemeProvider>
                <AuthProvider>
                    <SubscriptionProvider>
                        {children}
                    </SubscriptionProvider>
                </AuthProvider>
            </ThemeProvider>
        </I18nProvider>
    );
}
