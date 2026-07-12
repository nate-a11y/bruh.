import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "lake-ride-pros",
  project: "bruh",
  // Only print upload logs in CI; stay quiet locally.
  silent: !process.env.CI,
  // Upload a larger set of client bundles for readable stack traces.
  widenClientFileUpload: true,
  // Route browser Sentry requests through /monitoring to dodge ad-blockers.
  tunnelRoute: "/monitoring",
  disableLogger: true,
  // Release tracking: name each release by the deployed commit SHA (Vercel sets
  // VERCEL_GIT_COMMIT_SHA) and mark a production deploy. Errors are then tied to
  // the release/commit that introduced them. Source-map upload + release
  // creation only run when SENTRY_AUTH_TOKEN is present at build time.
  release: {
    name: process.env.VERCEL_GIT_COMMIT_SHA,
    deploy: { env: "production" },
  },
});

