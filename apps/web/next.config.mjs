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
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // The Typst PDF routes load the typst.ts WASM compiler/renderer dynamically;
  // Next's output tracing doesn't detect the .wasm binaries, so force-include them
  // or the standalone server 500s on every PDF render ("Failed to render PDF resume").
  outputFileTracingIncludes: {
    '/api/**': ['./node_modules/@myriaddreamin/**/*.wasm']
  }
};

export default nextConfig;
