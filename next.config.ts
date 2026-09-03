import type { NextConfig } from "next";

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
};

export default nextConfig;
