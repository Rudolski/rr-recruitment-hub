import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Supabase-origin uit de env halen zodat connect-src klopt als de
// browser-client ooit gebruikt wordt (nu draait alle data-toegang
// server-side).
let supabaseOrigin = "";
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
  }
} catch {
  // ongeldige of ontbrekende URL -> laat leeg
}

/**
 * Content-Security-Policy. Strak waar het kan; 'unsafe-inline' is nog
 * nodig voor de inline bootstrap-scripts en -styles die Next.js
 * injecteert (upgrade naar een nonce-gebaseerde policy is een aparte
 * stap). In dev heeft de React-refresh-runtime 'unsafe-eval' nodig.
 */
const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:`,
  `font-src 'self'`,
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}${
    isDev ? " ws:" : ""
  }`,
  // Alleen in productie afdwingen; lokaal draait de app op http en
  // zou dit localhost onbereikbaar maken.
  ...(isDev ? [] : [`upgrade-insecure-requests`]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // HSTS nooit in dev: dit "vergrendelt" http://localhost naar https in
  // de browser en breekt de lokale server.
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // pdf-parse (en pdfjs) op de server los laten, niet bundelen.
  serverExternalPackages: ["pdf-parse"],
  // De Word-templates worden op de server ingelezen (fs), niet
  // geïmporteerd. Zorg dat ze in de deploy-bundle terechtkomen.
  outputFileTracingIncludes: {
    "/tools/samenwerkingsovereenkomst/download": [
      "./src/lib/contract-templates/**",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
