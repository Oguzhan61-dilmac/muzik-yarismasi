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
            <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/hsd-logo.png"
                  alt="HSD, Huawei Student Developers"
                  width={264}
                  height={84}
                  className="h-11 w-auto shrink-0"
                />
                <p className="font-semibold leading-snug">
                  Bu site <span className="whitespace-nowrap">HSD İnönü</span> tarafından yapıldı.
                </p>
              </div>
              <p className="max-w-sm text-sm text-ink-soft sm:text-right">
                Şarkıların ve kapakların tüm hakları sahiplerine aittir. Sorun yaşarsan yarışma ekibine yaz.
              </p>
            </div>
          </footer>
        </PlayerProvider>
      </body>
    </html>
  );
}
