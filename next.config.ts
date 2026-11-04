import type { NextConfig } from "next";

const wpHost = process.env.WP_API_URL ? new URL(process.env.WP_API_URL).hostname : null;
const wcHost = process.env.WC_API_URL ? new URL(process.env.WC_API_URL).hostname : null;
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;

// Permanent redirects from the previous site paths (see docs/AUDIT.md).
const legacy: [string, string][] = [
  ["/noticias", "/es"],
  ["/miniaturas", "/es/miniaturas"],
  ["/manadas-de-urueh", "/es/facciones/manadas-de-urueh"],
  ["/vastagos-de-kurgan", "/es/facciones/vastagos-de-kurgan"],
  ["/adeptos-de-malesur", "/es/facciones/adeptos-de-malesur"],
  ["/comprar", "/es/tienda"],
  ["/comprar/:path*", "/es/tienda"],
  ["/contacto", "/es/comunidad"],
  ["/aviso-legal", "/es/legal/aviso-legal"],
  ["/politica-de-privacidad", "/es/legal/privacidad"],
  ["/politica-de-cookies", "/es/legal/cookies"],
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Self-contained server (.next/standalone): required by Hostinger's Node.js builder, which looks for it after `npm run build`.
  // (Vercel builds its own serverless output, so standalone is only for self-hosted Node servers.)
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  experimental: { globalNotFound: true }, // unmatched URLs: the root layout is a dynamic [locale] segment
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : []),
      ...(wcHost && wcHost !== wpHost ? [{ protocol: "https" as const, hostname: wcHost, pathname: "/wp-content/uploads/**" }] : []),
      ...(wpHost ? [{ protocol: "https" as const, hostname: wpHost, pathname: "/wp-content/uploads/**" }] : []),
    ],
  },
  async redirects() {
    return legacy.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    ];
    return [
      { source: "/:path*", headers: security },
      { source: "/wiki/images/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
