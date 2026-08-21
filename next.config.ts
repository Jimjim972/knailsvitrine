import type { NextConfig } from "next";

function configuredSupabaseOrigin() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.origin !== rawUrl || !["https:", "http:"].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

const isDevelopment = process.env.NODE_ENV === "development";
const supabaseOrigin = configuredSupabaseOrigin();
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
