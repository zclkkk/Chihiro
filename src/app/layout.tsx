import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Noto_Serif_SC } from "next/font/google";
import { ThemeModeInit } from "@/components/theme-mode-init";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const uiSans = Geist({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const readingSerif = Noto_Serif_SC({
  variable: "--font-reading",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const codeMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={siteConfig.locale}
      className={`${uiSans.variable} ${readingSerif.variable} ${codeMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full overflow-x-hidden">
        <ThemeModeInit />
        {children}
      </body>
    </html>
  );
}
