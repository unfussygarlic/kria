import type { Metadata } from "next";
import { Inter, Comfortaa } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { computePaletteCSS } from "@/lib/palettes";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-comfortaa",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Grid by Kria",
  description: "Post gigs, manage events, and track your Runners. All in one place.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.className} ${comfortaa.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        {/* Palette CSS — server-rendered from the ACTIVE_PRESET + ACTIVE_DARK_PRESET
            constants in `lib/palettes.ts`. Injected before any content so users
            never see the fallback values from globals.css. Both themes' vars
            are emitted; the `data-theme` attribute selects which set applies. */}
        <style dangerouslySetInnerHTML={{ __html: computePaletteCSS() }} />
        {/* Theme selector — defaults to LIGHT (matches Pocket). Runs before
            hydration to avoid FOUC. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('kria-grid-theme');document.documentElement.dataset.theme=t||'light';})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-bg text-text antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
