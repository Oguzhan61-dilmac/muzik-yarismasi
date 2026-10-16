"use client";

import { useState, useTransition } from "react";
import { setPhase } from "@/lib/admin-actions";
import { PHASE_HELP, PHASE_LABEL } from "@/lib/format";
import { PHASES, type Phase } from "@/lib/types";

const CONFIRM: Partial<Record<Phase, string>> = {
  review: "Başvurular kapanacak ve jüri puanlamaya başlayabilecek. Kimse yeni şarkı gönderemeyecek. Devam edilsin mi?",
  voting: "Jüri puanlaması kapanacak, oylama açılacak ve finalistler herkese görünecek. Devam edilsin mi?",
  results: "Oylama kapanacak ve oy sayıları herkese açılacak. Devam edilsin mi?",
};

export function PhaseControl({ current, finalists }: { current: Phase; finalists: number }) {
  const [selected, setSelected] = useState<Phase>(current);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function apply() {
    if (selected === current) return;
    const question = CONFIRM[selected];
    if (question && !confirm(question)) return;
    start(async () => {
      const res = await setPhase(selected);
      setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Aşama güncellendi.") : res.message });
    });
  }

  return (
    <div>
      <fieldset>
        <legend className="sr-only">Yarışma aşaması</legend>
        <ol className="border-t-2 border-ink">
          {PHASES.map((p) => (
            <li key={p} className="border-b-2 border-dotted border-ink/40">
              <label className={`flex cursor-pointer items-start gap-3 py-3 ${selected === p ? "" : "text-ink-soft"}`}>
                <input
                  type="radio"
                  name="phase"
                  value={p}
                  checked={selected === p}
                  onChange={() => setSelected(p)}
                  className="mt-1.5 h-5 w-5 accent-[var(--color-pink)]"
                />
                <span>
                  <span className="flex flex-wrap items-baseline gap-x-2 font-semibold text-ink">
                    {PHASE_LABEL[p]}
                    {p === current && (
                      <span className="rounded-full bg-pink px-2 py-0.5 text-xs font-bold">şu an</span>
                    )}
                  </span>
                  <span className="block text-sm">{PHASE_HELP[p]}</span>
                  {p === "voting" && finalists === 0 && (
                    <span className="mt-1 block text-sm font-semibold text-pink-deep">
                      Önce Başvurular sekmesinden en az bir finalist seç.
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ol>
      </fieldset>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={apply} disabled={pending || selected === current} className="btn btn-primary">
          {pending ? "Değiştiriliyor…" : "Aşamayı değiştir"}
        </button>
        {message && (
          <p role="status" className={`font-semibold ${message.ok ? "" : "text-pink-deep"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
