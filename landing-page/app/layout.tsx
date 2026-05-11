import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Inter, Comfortaa } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-comfortaa",
  display: "swap",
});

export const metadata: Metadata = {
  title: "kria",
  description:
    "kria is a swipe-based gig marketplace where workers and businesses connect instantly. No resumes. No waiting. Just swipe.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "kria",
    description: "A gig economy app that works like Tinder for jobs.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.className} ${comfortaa.variable} h-full`}>
      <body className="min-h-full bg-[#0B0F0A]">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
