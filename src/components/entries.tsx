import Link from "next/link";
import { CoverPlayer } from "./cover-player";
import { VoteButton } from "./vote-button";
import { STATUS_LABEL } from "@/lib/format";
import type { Entry, EntryStatus } from "@/lib/types";
import type { Track } from "./player";

export function toTrack(e: Entry): Track {
  return { id: e.id, title: e.title, artist: e.artistName, cover: e.coverUrl, url: e.audioUrl };
}

export function StatusBadge({ status }: { status: EntryStatus }) {
  const style: Record<EntryStatus, string> = {
    submitted: "border-ink text-ink",
    finalist: "border-ink bg-pink text-ink",
    disqualified: "border-ink-soft text-ink-soft line-through",
  };
  return (
    <span className={`inline-block rounded-full border-2 px-2.5 py-0.5 text-sm font-bold ${style[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function FinalistGrid({
  entries,
  myVote,
  loggedIn,
  voting,
}: {
  entries: Entry[];
  myVote: string | null;
  loggedIn: boolean;
  voting: boolean;
}) {
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-col">
          <CoverPlayer track={toTrack(e)} />
          <h3 className="display mt-4 text-[2rem]">
            <Link href={`/sarki/${e.id}`} className="no-underline hover:underline">
              {e.title}
            </Link>
          </h3>
          <p className="mt-1 text-ink-soft">
            {e.artistName}
            {e.genre && <span className="ml-2 rounded-sm bg-ink/5 px-1.5 py-0.5 text-sm">{e.genre}</span>}
          </p>
          {e.aiTools && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{e.aiTools}</p>}
          {voting && (
            <div className="mt-4">
              <VoteButton entryId={e.id} myVote={myVote} loggedIn={loggedIn} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ResultsChart({ entries }: { entries: Entry[] }) {
  const max = Math.max(1, ...entries.map((e) => e.votes ?? 0));
  const total = entries.reduce((s, e) => s + (e.votes ?? 0), 0);
  return (
    <ol className="border-t-2 border-ink">
      {entries.map((e, i) => {
        const votes = e.votes ?? 0;
        const share = total ? Math.round((votes / total) * 100) : 0;
        const winner = i === 0 && votes > 0;
        return (
          <li
            key={e.id}
            className={`grid grid-cols-[3.25rem_4.5rem_1fr] items-center gap-x-4 border-b-2 border-ink py-4 sm:grid-cols-[4.5rem_6rem_1fr_9rem] ${
              winner ? "bg-pink/15" : ""
            }`}
          >
            <span className={`display tabular-nums ${winner ? "misprint text-6xl" : "text-5xl"}`}>{i + 1}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.coverUrl} alt="" className="aspect-square w-full border-2 border-ink object-cover" />
            <div className="min-w-0">
              <p className="display truncate text-2xl sm:text-3xl">
                <Link href={`/sarki/${e.id}`} className="no-underline hover:underline">
                  {e.title}
                </Link>
              </p>
              <p className="truncate text-ink-soft">
                {e.artistName}
                {winner && <span className="ml-2 font-bold text-pink-deep">Kazanan</span>}
              </p>
              <div className="mt-2 h-2 bg-ink/10 sm:hidden" aria-hidden="true">
                <div className="h-full bg-blue" style={{ width: `${(votes / max) * 100}%` }} />
              </div>
              <p className="mt-1 text-sm tabular-nums sm:hidden">
                {votes.toLocaleString("tr-TR")} oy, %{share}
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="display text-3xl tabular-nums">{votes.toLocaleString("tr-TR")}</p>
              <p className="text-sm text-ink-soft">oy, %{share}</p>
              <div className="mt-1 h-2 bg-ink/10" aria-hidden="true">
                <div className="ml-auto h-full bg-blue" style={{ width: `${(votes / max) * 100}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Paragraphs({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  return (
    <div className={`space-y-3 ${className}`}>
      {parts.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
