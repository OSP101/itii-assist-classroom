/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Optimize images with next/image
  images: {
    // Allow external images from common sources
    remotePatterns: [
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
};

module.exports = nextConfig;
