/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true
  },
  eslint: {
    dirs: ['app', 'components', 'lib']
  }
};

export default nextConfig;
