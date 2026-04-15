import type { NextConfig } from "next";

/** Where Next.js forwards `/api/*` (must match `manage.py runserver` — usually http, not https). */
const backendOrigin = (
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_DJANGO_URL ||
  "http://127.0.0.1:8000"
)
  .trim()
  .replace(/\/$/, "");

const serverlessIntegrations =
  process.env.NEXT_SERVERLESS_INTEGRATIONS === "true" ||
  process.env.NEXT_PUBLIC_USE_NEXT_INTEGRATION_API === "true";

const nextConfig: NextConfig = {
  turbopack: {},
  async rewrites() {
    if (serverlessIntegrations) {
      return [
        {
          source: "/api/:path((?!gsc/|cloudflare/).*)",
          destination: `${backendOrigin}/api/:path`,
        },
      ];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
