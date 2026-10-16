import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginButton } from "@/components/login-button";
import { PageShell, Skeleton } from "@/components/page-shell";
import { getMyEntries, getSettings, getViewer } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { SubmitForm } from "./submit-form";

export const metadata: Metadata = { title: "Şarkını gönder" };

export default function SubmitPage() {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <Submit />
    </Suspense>
  );
}

async function Submit() {
  const [settings, viewer] = await Promise.all([getSettings(), getViewer()]);
  const lead = settings.submissionDeadline
    ? `Son başvuru ${formatDate(settings.submissionDeadline)}.`
    : "Yapay zekâyla ürettiğin şarkıyı ve kapağını yükle, gerisini jüriye bırak.";

  if (settings.phase !== "submissions") {
    return (
      <PageShell title="Şarkını gönder" narrow>
        <p className="notice text-lg">
          {settings.phase === "upcoming"
            ? "Başvurular henüz açılmadı. Açıldığında bu sayfadan şarkını gönderebileceksin."
            : "Başvurular kapandı. Yarışmanın gidişatını ana sayfadan takip edebilirsin."}
        </p>
        <Link href="/" className="btn btn-ghost mt-6">
          Ana sayfaya dön
        </Link>
      </PageShell>
    );
  }

  if (!viewer) {
    return (
      <PageShell title="Şarkını gönder" lead={lead} narrow>
        <div className="panel max-w-xl p-6 sm:p-8">
          <p className="text-lg">Başvuru yapmak için önce Google hesabınla giriş yap.</p>
          <div className="mt-6">
            <LoginButton next="/katil" />
          </div>
        </div>
      </PageShell>
    );
  }

  const mine = await getMyEntries();
  const remaining = settings.maxEntriesPerUser - mine.length;
  if (remaining <= 0) {
    return (
      <PageShell title="Şarkını gönder" narrow>
        <p className="notice text-lg">
          Başvurun alındı. Kişi başı en fazla {settings.maxEntriesPerUser} şarkı gönderilebiliyor.
        </p>
        <Link href="/basvurum" className="btn btn-primary mt-6">
          Başvurunu gör
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell title="Şarkını gönder" lead={lead}>
      <SubmitForm userId={viewer.id} />
    </PageShell>
  );
}
