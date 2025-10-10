/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker deployment
  output: 'standalone',
  
  // ✅ БЕЗОПАСНОСТЬ: Проверки ESLint и TypeScript ВКЛЮЧЕНЫ
  eslint: {
    ignoreDuringBuilds: false, // Не игнорируем ошибки ESLint
  },
  typescript: {
    ignoreBuildErrors: false, // Не игнорируем ошибки TypeScript
  },
  
  experimental: {
    // Enable server components
    serverComponentsExternalPackages: [],
  },
  
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Fix lightningcss issue in Vercel
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
