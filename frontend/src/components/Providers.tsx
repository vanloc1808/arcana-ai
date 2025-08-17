'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <SubscriptionProvider>
                    {children}
                </SubscriptionProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
