import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RR Recruitment Hub",
    short_name: "RR Hub",
    description: "Interne webapplicatie voor RR Recruitment",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fff7ec",
    theme_color: "#0d1e2e",
    icons: [
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
