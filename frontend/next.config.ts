import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove the automatic redirect - let middleware handle authentication routing
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',  // Local development backend
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',  // Keep for transition period
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',  // Cloudflare R2 direct URLs
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflarestorage.com',  // Cloudflare R2 storage URLs
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'backend-tarotreader.nguyenvanloc.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'backend-arcanaai.nguyenvanloc.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.nguyenvanloc.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',  // jsDelivr CDN (from existing docs)
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Explicitly enable environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  reactStrictMode: false,
};

export default nextConfig;
