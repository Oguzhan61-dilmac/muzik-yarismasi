import "@fontsource-variable/big-shoulders";
import "@fontsource-variable/schibsted-grotesk";
import "./globals.css";

import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayerProvider } from "@/components/player";
import { PreviewBanner } from "@/components/preview-banner";
import { SiteHeader, SiteHeaderSkeleton } from "@/components/site-header";
import { getSettings } from "@/lib/data";
import { SITE_URL, isPreview } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: s.title, template: `%s | ${s.title}` },
    description: s.tagline,
    openGraph: { title: s.title, description: s.tagline, type: "website", locale: "tr_TR" },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <PlayerProvider>
          {isPreview && (
            <Suspense fallback={null}>
              <PreviewBanner />
            </Suspense>
          )}
          <Suspense fallback={<SiteHeaderSkeleton />}>
            <SiteHeader />
          </Suspense>
          <main className="flex-1 pb-28">{children}</main>
          <footer className="border-t-2 border-ink">
            <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-soft">
              Şarkıların ve kapakların tüm hakları sahiplerine aittir. Sorun yaşarsan yarışma ekibine yaz.
            </div>
          </footer>
        </PlayerProvider>
      </body>
    </html>
  );
}
