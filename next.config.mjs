const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/notionisdead";
export default {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // /f/<id> style public routes live under the same basePath.
  poweredByHeader: false,
  // PostHog reverse proxy (<basePath>/ingest → PostHog US) so ad blockers don't drop analytics; see docs/ANALYTICS.md.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
};
