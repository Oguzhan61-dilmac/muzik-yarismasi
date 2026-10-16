import { formatDate } from "@/lib/format";
import type { Phase, Settings } from "@/lib/types";

const ORDER: Phase[] = ["submissions", "review", "voting", "results"];

/** Yarışma takvimi, albüm arka kapağındaki şarkı listesi gibi. */
export function PhaseTracklist({ settings }: { settings: Settings }) {
  const current = ORDER.indexOf(settings.phase); // "upcoming" ise -1
  const rows: { phase: Phase; label: string; note: string }[] = [
    {
      phase: "submissions",
      label: "Başvuru",
      note: settings.submissionDeadline ? `Son gün ${formatDate(settings.submissionDeadline)}` : "Şarkı ve kapak gönderilir",
    },
    { phase: "review", label: "Jüri değerlendirmesi", note: "Finalistler seçilir" },
    {
      phase: "voting",
      label: "Final oylaması",
      note: settings.votingEndsAt ? `Bitiş ${formatDate(settings.votingEndsAt)}` : "Herkes bir oy verir",
    },
    { phase: "results", label: "Sonuçlar", note: "Kazanan açıklanır" },
  ];

  return (
    <ol className="divide-y-2 divide-dotted divide-ink/40 border-y-2 border-ink">
      {rows.map((row, i) => {
        const state = i < current ? "done" : i === current ? "now" : "next";
        return (
          <li
            key={row.phase}
            aria-current={state === "now" ? "step" : undefined}
            className={`grid grid-cols-[3rem_1fr] items-baseline gap-x-3 py-3 sm:grid-cols-[3.5rem_1fr_auto] ${
              state === "done" ? "text-ink-soft" : ""
            }`}
          >
            <span className="display text-3xl tabular-nums sm:text-4xl">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex flex-wrap items-baseline gap-x-3">
              <span className={`text-lg font-semibold sm:text-xl ${state === "done" ? "line-through decoration-2" : ""}`}>
                {row.label}
              </span>
              {state === "now" && (
                <span className="rounded-full bg-pink px-2.5 py-0.5 text-sm font-bold text-ink">şu an</span>
              )}
            </span>
            <span className="col-start-2 text-ink-soft sm:col-start-3 sm:text-right">{row.note}</span>
          </li>
        );
      })}
    </ol>
  );
}
