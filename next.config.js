/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
  },
  redirects: async () => [
    {
      source: '/admin/operations/checklist',
      destination: '/admin/operations',
      permanent: true,
    },
    {
      source: '/admin/inventory/checklist/history',
      destination: '/admin/operations/history',
      permanent: true,
    },
    {
      source: '/admin/inventory/checklist',
      destination: '/admin/operations',
      permanent: true,
    },
    {
      source: '/admin/inventory/containers',
      destination: '/admin/operations/beverage/containers',
      permanent: true,
    },
    {
      source: '/admin/inventory/:path*',
      destination: '/admin/operations/:path*',
      permanent: true,
    },
    {
      source: '/admin/inventory',
      destination: '/admin/operations',
      permanent: true,
    },
  ],
  headers: async () => [    {
      source: '/:path*',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; connect-src 'self' https://*.supabase.co https://*.firebaseio.com https://*.googleapis.com https://*.cloudfunctions.net; frame-src 'self' https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; form-action 'self';" },
      ],
    },
    {
      source: '/videos/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/images/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
}

module.exports = nextConfig