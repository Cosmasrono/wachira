import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, IBM_Plex_Mono, Karla } from "next/font/google";
import { SITE } from "@/lib/config";
import "./globals.css";

const display = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-display" });
const body = Karla({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: `${SITE.name} – ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: "Kitenge, linen and tailored clothing made in Kenya. Order in your size or made to your measurements, and pay with M-Pesa.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
