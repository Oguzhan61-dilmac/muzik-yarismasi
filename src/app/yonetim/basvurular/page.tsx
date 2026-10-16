import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { EntryActions } from "@/components/admin/entry-actions";
import { StatusBadge, toTrack } from "@/components/entries";
import { Skeleton } from "@/components/page-shell";
import { PlayButton } from "@/components/player";
import { getAllEntries, getCriteria, getSettings } from "@/lib/data";
import { formatShortDate } from "@/lib/format";
import { formatScore, type Criterion, type Entry, type EntryStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Başvurular" };

const FILTERS: { key: string; label: string; status?: EntryStatus }[] = [
  { key: "", label: "Tümü" },
  { key: "degerlendirmede", label: "Değerlendirmede", status: "submitted" },
  { key: "finalist", label: "Finalist", status: "finalist" },
  { key: "disi", label: "Yarışma dışı", status: "disqualified" },
];

type Search = { durum?: string; sira?: string };
type Props = { searchParams: Promise<Search> };

export default function EntriesAdminPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton lines={8} />}>
      <AdminShell next="/yonetim/basvurular" adminOnly>
        {() => <EntriesList searchParams={searchParams} />}
      </AdminShell>
    </Suspense>
  );
}

function href(params: Search) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
  return q ? `/yonetim/basvurular?${q}` : "/yonetim/basvurular";
}

async function EntriesList({ searchParams }: Props) {
  const [{ durum = "", sira }, all, settings, criteria] = await Promise.all([
    searchParams,
    getAllEntries(),
    getSettings(),
    getCriteria(),
  ]);
  const filter = FILTERS.find((f) => f.key === durum) ?? FILTERS[0];
  const juryPhase = settings.phase !== "upcoming" && settings.phase !== "submissions";
  const byScore = sira ? sira === "puan" : juryPhase;
  const showVotes = settings.phase === "voting" || settings.phase === "results";

  const entries = (filter.status ? all.filter((e) => e.status === filter.status) : all).slice();
  if (byScore) {
    entries.sort((a, b) => (b.juryScore ?? -1) - (a.juryScore ?? -1) || b.createdAt.localeCompare(a.createdAt));
  }
  const inContest = all.filter((e) => e.status !== "disqualified");
  const scoredCount = inContest.filter((e) => (e.judges ?? 0) > 0).length;

  return (
    <div>
      {settings.phase === "review" && (
        <p className="notice mb-6">
          Jüri puanlıyor: {scoredCount} / {inContest.length} şarkı en az bir jüriden
          puan aldı. Liste jüri ortalamasına göre sıralı; finale almak istediklerini işaretle, sonra Yarışma sekmesinden
          oylamayı aç.
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count = f.status ? all.filter((e) => e.status === f.status).length : all.length;
          const active = f.key === filter.key;
          return (
            <Link
              key={f.key}
              href={href({ durum: f.key, sira })}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border-2 px-3 py-1 text-sm font-semibold no-underline ${
                active ? "border-ink bg-ink text-paper" : "border-ink/30 hover:border-ink"
              }`}
            >
              {f.label} <span className="tabular-nums opacity-70">{count}</span>
            </Link>
          );
        })}
        <span className="ml-auto flex flex-wrap items-center gap-x-3 text-sm">
          <span className="text-ink-soft">Sırala:</span>
          <Link href={href({ durum, sira: "puan" })} aria-current={byScore ? "true" : undefined}
            className={byScore ? "font-bold no-underline" : "text-ink-soft"}>
            Jüri puanı
          </Link>
          <Link href={href({ durum, sira: "yeni" })} aria-current={!byScore ? "true" : undefined}
            className={!byScore ? "font-bold no-underline" : "text-ink-soft"}>
            En yeni
          </Link>
          {all.length > 0 && (
            <a href="/yonetim/disa-aktar" className="btn btn-quiet min-h-9">
              Excel için indir (CSV)
            </a>
          )}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="notice">Bu listede başvuru yok.</p>
      ) : (
        <ol className="border-t-2 border-ink">
          {entries.map((e, i) => (
            <li
              key={e.id}
              className="grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-3 border-b-2 border-ink py-4 md:grid-cols-[5.5rem_1fr_7.5rem_auto_10rem]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.coverUrl} alt="" loading="lazy" className="aspect-square w-full border-2 border-ink object-cover" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {byScore && e.juryScore != null && (
                    <span className="text-sm font-bold tabular-nums text-ink-soft">{i + 1}.</span>
                  )}
                  <StatusBadge status={e.status} />
                  {showVotes && e.status === "finalist" && (
                    <span className="text-sm font-bold tabular-nums">{(e.votes ?? 0).toLocaleString("tr-TR")} oy</span>
                  )}
                </div>
                <p className="display mt-1 text-2xl">
                  <Link href={`/sarki/${e.id}`} className="no-underline hover:underline">{e.title}</Link>
                </p>
                <p className="text-ink-soft">
                  {e.artistName}
                  {e.genre && <span className="ml-2">{e.genre}</span>}
                </p>
                {(e.ownerName || e.ownerEmail) && (
                  <p className="mt-1 truncate text-sm text-ink-soft">
                    Gönderen {e.ownerName ?? ""} {e.ownerEmail && <span>({e.ownerEmail})</span>}, {formatShortDate(e.createdAt)}
                  </p>
                )}
                {e.description && (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer font-semibold">Hikâyesi</summary>
                    <p className="mt-1 max-w-prose whitespace-pre-line">{e.description}</p>
                  </details>
                )}
              </div>
              <JuryScore entry={e} criteria={criteria} />
              <div className="col-start-2 md:col-start-4 md:self-center">
                <PlayButton track={toTrack(e)} />
              </div>
              <div className="col-start-2 md:col-start-5 md:self-center">
                <EntryActions entryId={e.id} title={e.title} status={e.status} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function JuryScore({ entry, criteria }: { entry: Entry; criteria: Criterion[] }) {
  const judges = entry.judges ?? 0;
  if (!judges) {
    return (
      <p className="col-start-2 text-sm text-ink-soft md:col-start-3 md:self-center">Henüz jüri puanı yok</p>
    );
  }
  return (
    <div className="col-start-2 md:col-start-3 md:self-center">
      <p>
        <span className="display text-4xl tabular-nums">{formatScore(entry.juryScore)}</span>
        <span className="ml-1 text-sm text-ink-soft">/ 10</span>
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-soft">{judges} jüri</summary>
        <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3">
          {criteria.map((c) => (
            <div key={c.id} className="contents">
              <dt className="truncate">{c.name}</dt>
              <dd className="text-right tabular-nums">{formatScore(entry.criteriaScores?.[c.id])}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
