/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Skip ESLint during production builds (run separately in CI if needed)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Optimize images with next/image
  images: {
    // Allow external images from common sources
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS hosts for dynamic course images
      },
    ],
    // Optimize image formats
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Performance optimizations
  compiler: {
    // Remove console.log in production (except console.error and console.warn)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Experimental features for better performance
  experimental: {
    // Optimize package imports (tree-shaking)
    optimizePackageImports: [
      '@heroui/react',
      '@heroui/button',
      '@heroui/card',
      '@heroui/chip',
      '@heroui/dropdown',
      '@heroui/input',
      '@heroui/modal',
      '@heroui/select',
      '@heroui/spinner',
      '@heroui/table',
      '@heroui/avatar',
      '@heroui/toast',
      '@heroui/progress',
      '@heroui/divider',
      '@heroui/tooltip',
      '@iconify/react',
      'react-icons',
      'framer-motion',
      'socket.io-client',
    ],
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor chunks
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Separate HeroUI components
            heroui: {
              test: /[\\/]node_modules[\\/]@heroui[\\/]/,
              name: 'heroui',
              chunks: 'all',
              priority: 20,
            },
            // Separate icons
            icons: {
              test: /[\\/]node_modules[\\/](@iconify|react-icons)[\\/]/,
              name: 'icons',
              chunks: 'all',
              priority: 20,
            },
          },
        },
      };
    }
    return config;
  },

  // Headers for caching static assets
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(js|css)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Reduce bundle size by excluding unused locales
  i18n: undefined,

  // Enable React strict mode for catching issues early
  reactStrictMode: true,

  // Power by header removal (security)
  poweredByHeader: false,
};

module.exports = nextConfig;
