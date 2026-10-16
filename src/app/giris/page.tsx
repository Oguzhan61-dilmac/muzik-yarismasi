import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginButton } from "@/components/login-button";
import { PageShell, Skeleton } from "@/components/page-shell";
import { getViewer } from "@/lib/data";
import { isPreview } from "@/lib/env";

export const metadata: Metadata = { title: "Giriş yap" };

type Props = { searchParams: Promise<{ next?: string; hata?: string }> };

function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Props) {
  const { next, hata } = await searchParams;
  const target = safeNext(next);
  const viewer = await getViewer();
  if (viewer && !isPreview) redirect(target);

  return (
    <PageShell title="Giriş yap" narrow>
      <div className="panel max-w-xl p-6 sm:p-8">
        <p className="text-lg">
          Şarkı göndermek ve oy vermek için Google hesabınla giriş yap. Şifre oluşturman gerekmez.
        </p>
        <p className="mt-3 text-ink-soft">
          Hesabından yalnızca adını, e-posta adresini ve profil fotoğrafını görürüz. E-postan diğer
          katılımcılara gösterilmez.
        </p>
        {hata && (
          <p role="alert" className="notice notice-error mt-5">
            Giriş tamamlanamadı. Tekrar dene; sorun sürerse tarayıcının çerezleri engellemediğinden emin ol.
          </p>
        )}
        <div className="mt-6">
          <LoginButton next={target} />
        </div>
      </div>
    </PageShell>
  );
}
