'use client';

import React, { createContext, useContext, useEffect } from 'react';

type Theme = 'dark';

interface ThemeContextType {
    theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme: Theme = 'dark';

    useEffect(() => {
        // Always set dark mode
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add('dark');
        // Remove any saved theme preference since we only support dark mode now
        localStorage.removeItem('theme');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
