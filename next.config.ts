import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Bundle the starter templates into the serverless function so the
  // /api/template/[id] route can read them at runtime on Vercel.
  outputFileTracingIncludes: {
    "/api/template/[id]": ["./vibecode-starters/**/*"],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
  reactStrictMode: false,
  // Don't fail production builds on ESLint warnings (unused vars, `any`, etc.).
  // The code still type-checks and compiles.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;