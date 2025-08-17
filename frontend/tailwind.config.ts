import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: 'class',
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Mystical Purple Palette
                primary: {
                    50: '#faf5ff',
                    100: '#f3e8ff',
                    200: '#e9d5ff',
                    300: '#d8b4fe',
                    400: '#c084fc',
                    500: '#8b5cf6',
                    600: '#7c3aed',
                    700: '#6d28d9',
                    800: '#5b21b6',
                    900: '#4c1d95',
                },
                // Gold Accents
                accent: {
                    200: '#fef3c7',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    700: '#b45309',
                },
                // Midnight Blues
                midnight: {
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#312e81',
                    900: '#1e1b4b',
                },
                // Parchment Colors
                parchment: {
                    light: '#fef3c7',
                    medium: '#fde68a',
                    dark: '#f3d373',
                },
            },
            backgroundImage: {
                // Cosmic gradients
                'cosmic': 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
                'cosmic-radial': 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f0f23 50%, #000000 100%)',

                // Mystical gradients
                'mystical': 'linear-gradient(135deg, #7c3aed, #f59e0b)',
                'mystical-cosmic': 'linear-gradient(135deg, #8b5cf6, #2563eb, #6d28d9)',

                // Star patterns
                'stars': `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fbbf24' fill-opacity='0.1'%3E%3Cpath d='M30 30l2-2 2 2-2 2-2-2z'/%3E%3Cpath d='M20 20l1-1 1 1-1 1-1-1z'/%3E%3Cpath d='M45 10l1.5-1.5 1.5 1.5-1.5 1.5-1.5-1.5z'/%3E%3Cpath d='M10 45l1-1 1 1-1 1-1-1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,

                // Parchment texture
                'parchment': `linear-gradient(45deg, #fef3c7 25%, transparent 25%),
                             linear-gradient(-45deg, #fef3c7 25%, transparent 25%),
                             linear-gradient(45deg, transparent 75%, #fde68a 75%),
                             linear-gradient(-45deg, transparent 75%, #fde68a 75%)`,

                // Mystical background with subtle patterns
                'mystical-pattern': `radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
                                   radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.05) 0%, transparent 50%),
                                   radial-gradient(circle at 40% 80%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)`,
            },
            backgroundSize: {
                'stars': '60px 60px',
                'parchment': '20px 20px',
            },
            fontFamily: {
                // Serif fonts for headers and mystical elements
                'mystical': ['Playfair Display', 'Cormorant Garamond', 'serif'],
                'serif-alt': ['Cormorant Garamond', 'Playfair Display', 'serif'],
                'accent': ['Cinzel', 'serif'],

                // Sans-serif fonts for body text
                'body': ['Inter', 'Source Sans Pro', 'system-ui', 'sans-serif'],
                'sans-alt': ['Source Sans Pro', 'Inter', 'system-ui', 'sans-serif'],

                // System defaults
                'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                'serif': ['Playfair Display', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
                'mono': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            fontSize: {
                // Mobile-first text sizes with better readability
                'xs': ['0.75rem', { lineHeight: '1rem' }],
                'sm': ['0.875rem', { lineHeight: '1.25rem' }],
                'base': ['1rem', { lineHeight: '1.6rem' }], // Improved mobile line height
                'lg': ['1.125rem', { lineHeight: '1.75rem' }],
                'xl': ['1.25rem', { lineHeight: '1.75rem' }],
                '2xl': ['1.5rem', { lineHeight: '2rem' }],
                '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
                '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
                '5xl': ['3rem', { lineHeight: '1' }],
                '6xl': ['3.75rem', { lineHeight: '1' }],
                '7xl': ['4.5rem', { lineHeight: '1' }],
                '8xl': ['6rem', { lineHeight: '1' }],
                '9xl': ['8rem', { lineHeight: '1' }],

                // Mobile-optimized mystical sizes
                'mystical-xs': ['0.875rem', { lineHeight: '1.3rem', letterSpacing: '0.025em' }],
                'mystical-sm': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.02em' }],
                'mystical-base': ['1.125rem', { lineHeight: '1.7rem', letterSpacing: '0.015em' }],
                'mystical-lg': ['1.25rem', { lineHeight: '1.8rem', letterSpacing: '0.01em' }],
                'mystical-xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '0.005em' }],
                'mystical-2xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '0' }],
                'mystical-3xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.01em' }],

                // Mobile-specific utility sizes
                'mobile-tiny': ['0.75rem', { lineHeight: '1rem' }],
                'mobile-small': ['0.875rem', { lineHeight: '1.25rem' }],
                'mobile-base': ['1rem', { lineHeight: '1.6rem' }],
                'mobile-large': ['1.125rem', { lineHeight: '1.7rem' }],
                'mobile-xl': ['1.25rem', { lineHeight: '1.8rem' }],
                'mobile-2xl': ['1.5rem', { lineHeight: '2rem' }],
                'mobile-3xl': ['1.875rem', { lineHeight: '2.25rem' }],
            },
            fontWeight: {
                thin: '100',
                extralight: '200',
                light: '300',
                normal: '400',
                medium: '500',
                semibold: '600',
                bold: '700',
                extrabold: '800',
                black: '900',
            },
            letterSpacing: {
                tighter: '-0.05em',
                tight: '-0.025em',
                normal: '0em',
                wide: '0.025em',
                wider: '0.05em',
                widest: '0.1em',
                mystical: '0.15em', // For special mystical text
            },
            boxShadow: {
                'mystical': '0 4px 15px 0 rgba(124, 58, 237, 0.2)',
                'mystical-lg': '0 10px 25px 0 rgba(124, 58, 237, 0.3)',
                'gold': '0 4px 15px 0 rgba(245, 158, 11, 0.2)',
                'cosmic': '0 4px 20px 0 rgba(30, 27, 75, 0.3)',
            },
            animation: {
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 3s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                glow: {
                    'from': { 'box-shadow': '0 0 5px rgba(124, 58, 237, 0.2)' },
                    'to': { 'box-shadow': '0 0 20px rgba(124, 58, 237, 0.6)' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
