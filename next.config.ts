import type { NextConfig } from "next";

// Vercel deployment test
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
    // Temporarily disable reactCompiler to fix webpack bundling issues
    // reactCompiler: true,
    // Speed up dev mode compilation
    // turbo: {
    //   resolveAlias: {
    //     // Help turbopack resolve Solana packages faster
    //   },
    // },
  },

  // Transpile Solana wallet adapter packages to fix vendor-chunks errors
  transpilePackages: [
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-wallets',
    '@solana/wallet-adapter-phantom',
    '@solana/wallet-adapter-solflare',
    '@solana/wallet-adapter-torus',
    '@solana-mobile/wallet-adapter-mobile',
  ],

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

      // Speed up dev mode by reducing work
      if (dev) {
        config.optimization = {
          ...config.optimization,
          // Disable some expensive optimizations in dev
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: false,
        };
      }
    }

    // Handle @ledgerhq packages - ignore them on server-side
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        '@ledgerhq/devices': '@ledgerhq/devices',
        '@ledgerhq/hw-transport': '@ledgerhq/hw-transport',
        '@ledgerhq/hw-transport-webhid': '@ledgerhq/hw-transport-webhid',
        '@ledgerhq/hw-transport-webusb': '@ledgerhq/hw-transport-webusb',
      });
    }

    return config;
  },
};

export default nextConfig;
