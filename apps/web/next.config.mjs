import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server bundle for lean Docker images (see infra/compose).
  output: 'standalone',
  experimental: {
    externalDir: true
  },
  transpilePackages: ['@resume-platform/shared-types'],
  outputFileTracingRoot: path.join(__dirname, '../..')
};

export default nextConfig;
