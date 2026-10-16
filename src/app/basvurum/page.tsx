import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusBadge, toTrack } from "@/components/entries";
import { CoverPlayer } from "@/components/cover-player";
import { LoginButton } from "@/components/login-button";
import { PageShell, Skeleton } from "@/components/page-shell";
import { ShareButton } from "@/components/share-button";
import { getMyEntries, getSettings, getViewer } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { Entry, Phase } from "@/lib/types";
import { WithdrawButton } from "./withdraw-button";

export const metadata: Metadata = { title: "Başvurum" };

type Props = { searchParams: Promise<{ gonderildi?: string }> };

export default function MyEntriesPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton lines={4} />}>
      <MyEntries searchParams={searchParams} />
    </Suspense>
  );
}

function statusText(e: Entry, phase: Phase): string {
  if (e.status === "disqualified") return "Bu başvuru kurallara uymadığı için yarışma dışı bırakıldı.";
  if (e.status === "finalist") {
    return phase === "voting"
      ? "Tebrikler, finaldesin! Oylama açık; sayfanı paylaşıp oy topla."
      : phase === "results"
        ? "Finale kaldın. Sıralamayı ana sayfada görebilirsin."
        : "Tebrikler, finaldesin! Oylama başlayınca şarkın herkese açılacak.";
  }
  if (phase === "submissions") return "Başvurun alındı. Başvurular kapanana kadar geri çekip yeniden gönderebilirsin.";
  if (phase === "review") return "Jüri şarkını dinleyip puanlıyor. Finalistler açıklanınca burada göreceksin.";
  return "Bu şarkı finale kalmadı. Katıldığın için teşekkürler!";
}

async function MyEntries({ searchParams }: Props) {
  const [{ gonderildi }, settings, viewer] = await Promise.all([searchParams, getSettings(), getViewer()]);

  if (!viewer) {
    return (
      <PageShell title="Başvurum" narrow>
        <div className="panel max-w-xl p-6 sm:p-8">
          <p className="text-lg">Başvurunu görmek için giriş yap.</p>
          <div className="mt-6">
            <LoginButton next="/basvurum" />
          </div>
        </div>
      </PageShell>
    );
  }

  const entries = await getMyEntries();
  const canSubmitMore = settings.phase === "submissions" && entries.length < settings.maxEntriesPerUser;

  return (
    <PageShell title="Başvurum" narrow>
      {gonderildi && entries.length > 0 && (
        <p role="status" className="notice mb-8 text-lg font-semibold">
          Şarkın gönderildi! Jüri değerlendirmesinden sonra sonucu burada göreceksin.
        </p>
      )}

      {entries.length === 0 ? (
        <div className="space-y-6">
          <p className="text-lg">Henüz bir başvurun yok.</p>
          {settings.phase === "submissions" && (
            <Link href="/katil" className="btn btn-primary text-lg">
              Şarkını gönder
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-12">
          {entries.map((e) => (
            <li key={e.id} className="grid gap-6 sm:grid-cols-[14rem_1fr]">
              <CoverPlayer track={toTrack(e)} />
              <div>
                <StatusBadge status={e.status} />
                <h2 className="display mt-3 text-4xl">{e.title}</h2>
                <p className="text-ink-soft">
                  {e.artistName}
                  {e.genre && <span className="ml-2">{e.genre}</span>}
                </p>
                {e.aiTools && (
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">Yapay zekâ araçları:</span> {e.aiTools}
                  </p>
                )}
                <p className="mt-4">{statusText(e, settings.phase)}</p>
                <p className="mt-2 text-sm text-ink-soft">Gönderildi: {formatDate(e.createdAt)}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {e.status === "finalist" && (
                    <>
                      <Link href={`/sarki/${e.id}`} className="btn btn-primary">
                        Finalist sayfan
                      </Link>
                      {settings.phase === "voting" && <ShareButton path={`/sarki/${e.id}`} title={e.title} />}
                    </>
                  )}
                  {settings.phase === "submissions" && e.status === "submitted" && (
                    <WithdrawButton entryId={e.id} title={e.title} />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canSubmitMore && entries.length > 0 && (
        <Link href="/katil" className="btn btn-ghost mt-12">
          Bir şarkı daha gönder
        </Link>
      )}
    </PageShell>
  );
}
