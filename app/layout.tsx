import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import {
  Bricolage_Grotesque,
  Newsreader,
  Space_Mono,
  Spline_Sans,
} from "next/font/google";

import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
});

const body = Spline_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

const quote = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-quote",
});

export const metadata: Metadata = {
  title: "Spin 500",
  description: "A private album-listening challenge.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="midnight"
      className={`${display.variable} ${body.variable} ${mono.variable} ${quote.variable}`}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
