import Link from "next/link";
import { getSettings, getViewer } from "@/lib/data";
import { isPreview } from "@/lib/env";
import { isStaff } from "@/lib/types";

const navLink = "rounded-sm px-2 py-1.5 font-semibold no-underline hover:underline";

export async function SiteHeader() {
  const [settings, viewer] = await Promise.all([getSettings(), getViewer()]);
  return (
    <>
      {settings.setupError && (
        <div role="alert" className="bg-pink-deep px-4 py-2 text-sm font-semibold text-white">
          <div className="mx-auto max-w-6xl">{settings.setupError}</div>
        </div>
      )}
      <header className="border-b-2 border-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
          <Link href="/" className="display text-[1.7rem] no-underline">
            {settings.title}
          </Link>
          <nav aria-label="Ana menü" className="ml-auto flex flex-wrap items-center gap-x-1 text-[0.95rem]">
            <Link href="/kurallar" className={navLink}>
              Kurallar
            </Link>
            {viewer && (
              <Link href="/basvurum" className={navLink}>
                Başvurum
              </Link>
            )}
            {isStaff(viewer) && (
              <Link href={viewer?.role === "admin" ? "/yonetim" : "/yonetim/puanla"} className={navLink}>
                {viewer?.role === "admin" ? "Yönetim" : "Jüri"}
              </Link>
            )}
            {viewer ? (
              <span className="ml-2 flex items-center gap-2">
                {viewer.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={viewer.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-full border-2 border-ink"
                  />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-pink text-sm font-bold">
                    {(viewer.fullName ?? viewer.email ?? "?").slice(0, 1).toLocaleUpperCase("tr-TR")}
                  </span>
                )}
                {!isPreview && (
                  <form action="/auth/cikis" method="post">
                    <button type="submit" className="btn btn-quiet min-h-0 py-1 text-[0.95rem]">
                      Çıkış
                    </button>
                  </form>
                )}
              </span>
            ) : (
              <Link href="/giris" className="btn btn-ghost ml-2 min-h-0 py-1.5">
                Giriş yap
              </Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}

export function SiteHeaderSkeleton() {
  return (
    <header className="border-b-2 border-ink">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
        <span className="block h-7 w-56 animate-pulse bg-ink/10" />
      </div>
    </header>
  );
}
