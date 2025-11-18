/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true
  },
  transpilePackages: ['@resume-platform/shared-types'],
  eslint: {
    dirs: ['app', 'components', 'lib']
  }
};

export default nextConfig;
