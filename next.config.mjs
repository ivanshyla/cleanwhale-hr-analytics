/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript и ESLint проверки включены
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
