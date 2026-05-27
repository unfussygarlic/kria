import type { Metadata } from "next";
import { Inter, Comfortaa } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('kria-grid-theme');document.documentElement.dataset.theme=t||'dark';})();`,
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
