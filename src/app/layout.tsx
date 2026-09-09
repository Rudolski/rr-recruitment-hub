import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Roc Grotesk Wide Medium — RR Recruitment huisstijl-kop/logolettertype.
const roc = localFont({
  src: "./fonts/roc-grotesk-wide-medium.otf",
  variable: "--font-roc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RR Recruitment Hub",
  description: "Interne webapplicatie voor RR Recruitment",
  appleWebApp: {
    capable: true,
    title: "RR Hub",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Geen maximumScale/userScalable: toegankelijkheid — zoomen mag.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${manrope.variable} ${roc.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
