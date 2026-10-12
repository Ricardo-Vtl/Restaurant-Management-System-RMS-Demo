/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";

// Supabase local (`supabase start`) solo en dev: permite desarrollar la demo
// contra el stack local sin tocar la BD remota.
const localSupabase = isDev
  ? " http://127.0.0.1:54321 http://localhost:54321 ws://127.0.0.1:54321 ws://localhost:54321"
  : "";

const csp = [
  "default-src 'self'",
  // 'unsafe-eval' solo en dev: React Refresh/HMR lo exige; en prod se omite
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://va.vercel-scripts.com https://vercel.live`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://placehold.co https://*.fbcdn.net https://*.s3.amazonaws.com https://*.cloudfront.net${localSupabase}`,
  "font-src 'self'",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${localSupabase} https://va.vercel-scripts.com https://vitals.vercel-analytics.com`,
  "frame-src https://www.google.com https://vercel.live",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "placehold.co" },

      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "https", hostname: "*.cloudfront.net" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
