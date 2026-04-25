import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { CodeBlockCopyController } from "@/components/code-block-copy-controller";
import { ThemeModeInit } from "@/components/theme-mode-init";
import { resolveCanonicalSiteUrl, siteConfig } from "@/lib/site";
import { getSiteSettings } from "@/server/repositories/site";
import "./globals.css";

const uiSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const codeMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  let siteName = siteConfig.name;
  let siteDescription = siteConfig.description;
  let siteSettings = null;

  try {
    siteSettings = await getSiteSettings();

    if (siteSettings) {
      siteName = siteSettings.siteName;
      siteDescription = siteSettings.siteDescription;
    }
  } catch {
    // Fall back to static config when settings are unavailable.
  }

  return {
    metadataBase: new URL(resolveCanonicalSiteUrl(siteSettings)),
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={siteConfig.locale}
      className={`${uiSans.variable} ${codeMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full overflow-x-hidden">
        <ThemeModeInit />
        <CodeBlockCopyController />
        {children}
      </body>
    </html>
  );
}
