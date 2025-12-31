/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Fix for static file 404s in development
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 60 seconds
    pagesBufferLength: 10,
  },
  // Suppress hydration warnings for client-only components
  reactStrictMode: true,
  // Improve webpack config for better dev experience
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Use filesystem cache instead of disabling it completely
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      }
      // Reduce noise from webpack
      config.infrastructureLogging = {
        level: 'error',
      }
    }
    return config
  },
  // Reduce logging in development
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

module.exports = nextConfig

