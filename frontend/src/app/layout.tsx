import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { EnhancedNavigation } from "@/components/EnhancedNavigation";

export const metadata: Metadata = {
  title: "ArcanaAI - Tarot Reflection Companion",
  description: "Explore situations and choices through Tarot symbolism, AI reflection, and thoughtful next steps.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: '/favicon.svg',
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ArcanaAI',
  },
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-body bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 min-h-screen" suppressHydrationWarning>
        <Providers>
          <ServiceWorkerRegistrar />
          <EnhancedNavigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}
