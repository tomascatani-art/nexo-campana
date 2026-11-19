import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  outputFileTracingIncludes: { '/compartir/*': ['./assets/fonts/**'] },
  serverExternalPackages: ['sharp'],
  experimental: {
    serverActions: { bodySizeLimit: '4mb' },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [70, 75, 85],
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/video/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};

export default nextConfig;
