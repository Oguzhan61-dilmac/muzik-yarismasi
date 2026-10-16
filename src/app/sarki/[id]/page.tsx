import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CoverPlayer } from "@/components/cover-player";
import { Paragraphs, StatusBadge, toTrack } from "@/components/entries";
import { Skeleton } from "@/components/page-shell";
import { ShareButton } from "@/components/share-button";
import { VoteButton } from "@/components/vote-button";
import { getEntry, getMyVote, getSettings, getViewer } from "@/lib/data";
import { formatDate } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const entry = await getEntry(id);
  if (!entry) return { title: "Şarkı bulunamadı" };
  const title = `${entry.title}, ${entry.artistName}`;
  const image = entry.coverUrl.startsWith("data:") ? undefined : [{ url: entry.coverUrl, alt: `${entry.title} kapağı` }];
  return {
    title,
    description: `${entry.artistName} finalde. Dinle ve oyunu ver.`,
    openGraph: { title, description: "Dinle ve oyunu ver.", images: image },
    twitter: { card: "summary_large_image", title, images: image?.map((i) => i.url) },
  };
}

export default function SongPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton lines={4} />}>
      <Song params={params} />
    </Suspense>
  );
}

async function Song({ params }: Props) {
  const { id } = await params;
  const [entry, settings, viewer] = await Promise.all([getEntry(id), getSettings(), getViewer()]);
  if (!entry) notFound();

  const voting = settings.phase === "voting" && entry.status === "finalist";
  const myVote = voting ? await getMyVote() : null;
  const isOwner = viewer?.id === entry.userId;
  const isPublic = entry.status === "finalist" && (settings.phase === "voting" || settings.phase === "results");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:pt-14">
      <Link href="/#finalistler" className="text-sm font-semibold">
        Tüm finalistler
      </Link>
      <div className="mt-6 grid gap-10 md:grid-cols-[minmax(0,26rem)_1fr] md:gap-14">
        <CoverPlayer track={toTrack(entry)} size="lg" />
        <div className="md:pt-4">
          {entry.status !== "finalist" || !isPublic ? <StatusBadge status={entry.status} /> : null}
          <h1 className="display misprint mt-3 text-[clamp(3rem,8vw,5.5rem)] [overflow-wrap:anywhere]">{entry.title}</h1>
          <p className="mt-2 text-2xl">{entry.artistName}</p>
          {entry.genre && <p className="mt-1 text-ink-soft">{entry.genre}</p>}
          {entry.aiTools && (
            <p className="mt-4 max-w-prose">
              <span className="font-semibold">Yapay zekâ araçları:</span> {entry.aiTools}
            </p>
          )}

          {entry.description && <Paragraphs text={entry.description} className="mt-6 max-w-prose text-lg" />}

          {voting && (
            <div className="mt-8 max-w-sm">
              <VoteButton entryId={entry.id} myVote={myVote} loggedIn={Boolean(viewer)} />
              {settings.votingEndsAt && (
                <p className="mt-2 text-sm text-ink-soft">Oylamanın bitişi {formatDate(settings.votingEndsAt)}.</p>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {isPublic && <ShareButton path={`/sarki/${entry.id}`} title={entry.title} />}
          </div>

          {!isPublic && (
            <p className="notice mt-8">
              {isOwner
                ? "Bu sayfayı şu an yalnızca sen ve yarışma ekibi görebiliyor. Finale kalırsan oylama başladığında herkese açılır."
                : "Bu sayfayı yarışma ekibi olduğun için görüyorsun; şu an herkese açık değil."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
