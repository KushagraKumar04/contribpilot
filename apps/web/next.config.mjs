import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '../../.env') });

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }
];

const isDev = process.env.NODE_ENV !== 'production';

const config = {
  reactStrictMode: !isDev,
  poweredByHeader: false,
  serverExternalPackages: ['bullmq', 'ioredis'],
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons']
  },
  transpilePackages: [
  '@contribpilot/config',
  '@contribpilot/shared',
  '@contribpilot/db',
  '@contribpilot/github',
  'next-themes' 
],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};

export default config;