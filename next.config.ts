import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Enable React Compiler for automatic memoization
  experimental: {
    reactCompiler: true,
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 1 week
  },

  // Optimize production bundles
  productionBrowserSourceMaps: false,

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Optimize for browser bundle size
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // Tree-shake better (only in production to avoid conflicts with dev mode)
      if (!dev) {
        config.optimization.usedExports = true;
      }
    }

    return config;
  },
};

export default nextConfig;
