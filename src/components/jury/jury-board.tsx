"use client";

import { useMemo, useState, useTransition } from "react";
import { PlayButton } from "@/components/player";
import { saveJuryScores } from "@/lib/actions";
import { formatScore, weightedAverage, type Criterion, type JuryCard } from "@/lib/types";

type Draft = { scores: Record<string, number>; note: string };

function isComplete(scores: Record<string, number>, criteria: Criterion[]) {
  return criteria.every((c) => typeof scores[c.id] === "number");
}

function sameDraft(a: Draft, b: Draft) {
  const keys = new Set([...Object.keys(a.scores), ...Object.keys(b.scores)]);
  for (const k of keys) if (a.scores[k] !== b.scores[k]) return false;
  return a.note.trim() === b.note.trim();
}

export function JuryBoard({
  cards,
  criteria,
  canScore,
  blind,
}: {
  cards: JuryCard[];
  criteria: Criterion[];
  canScore: boolean;
  blind: boolean;
}) {
  const saved = useMemo(
    () => Object.fromEntries(cards.map((c) => [c.entry.id, { scores: c.myScores, note: c.myNote } as Draft])),
    [cards],
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>(saved);
  const [index, setIndex] = useState(() => {
    const firstOpen = cards.findIndex((c) => !isComplete(c.myScores, criteria));
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!cards.length) {
    return <p className="notice">Henüz puanlanacak şarkı yok. Başvurular geldikçe burada listelenecek.</p>;
  }

  const card = cards[Math.min(index, cards.length - 1)];
  const id = card.entry.id;
  const draft = drafts[id] ?? { scores: {}, note: "" };
  const done = cards.filter((c) => isComplete(saved[c.entry.id]?.scores ?? {}, criteria)).length;
  const dirty = !sameDraft(draft, saved[id] ?? { scores: {}, note: "" });
  const average = weightedAverage(draft.scores, criteria);
  const complete = isComplete(draft.scores, criteria);

  function update(patch: Partial<Draft>) {
    setMessage(null);
    setDrafts((d) => ({ ...d, [id]: { ...draft, ...patch } }));
  }

  function go(i: number) {
    setMessage(null);
    setIndex(Math.max(0, Math.min(cards.length - 1, i)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function save(andNext: boolean) {
    start(async () => {
      const res = await saveJuryScores(id, draft.scores, draft.note);
      if (!res.ok) {
        setMessage({ ok: false, text: res.message });
        return;
      }
      if (andNext) {
        const next = cards.findIndex(
          (c, i) => i > index && !isComplete(saved[c.entry.id]?.scores ?? {}, criteria) && c.entry.id !== id,
        );
        if (next !== -1) go(next);
        else if (index < cards.length - 1) go(index + 1);
      }
      setMessage({ ok: true, text: `${card.code} kaydedildi.` });
    });
  }

  const track = {
    id,
    title: card.entry.title,
    artist: blind ? card.code : card.entry.artistName,
    cover: card.entry.coverUrl,
    url: card.entry.audioUrl,
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[17rem_1fr]">
      {/* --------------------------------------------------------- şarkı listesi */}
      <aside aria-labelledby="liste-baslik" className="lg:sticky lg:top-6 lg:self-start">
        <h2 id="liste-baslik" className="sr-only">Şarkılar</h2>
        <p className="font-semibold">
          <span className="display text-4xl tabular-nums">{done}</span>
          <span className="text-ink-soft"> / {cards.length} şarkı puanlandı</span>
        </p>
        <div className="mt-2 h-2 border-2 border-ink bg-sheet" aria-hidden="true">
          <div className="h-full bg-pink" style={{ width: `${(done / cards.length) * 100}%` }} />
        </div>

        {/* Mobilde: önceki / sonraki */}
        <div className="mt-5 flex items-center gap-2 lg:hidden">
          <button type="button" className="btn btn-ghost bg-sheet" onClick={() => go(index - 1)} disabled={index === 0}>
            Önceki
          </button>
          <label className="sr-only" htmlFor="sarki-sec">Şarkı seç</label>
          <select
            id="sarki-sec"
            className="input min-w-0 flex-1"
            value={index}
            onChange={(e) => go(Number(e.target.value))}
          >
            {cards.map((c, i) => (
              <option key={c.entry.id} value={i}>
                {isComplete(saved[c.entry.id]?.scores ?? {}, criteria) ? "✓ " : ""}
                {c.code}: {c.entry.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-ghost bg-sheet"
            onClick={() => go(index + 1)}
            disabled={index === cards.length - 1}
          >
            Sonraki
          </button>
        </div>

        {/* Masaüstünde: tam liste */}
        <ol className="mt-5 hidden max-h-[70vh] overflow-y-auto border-t-2 border-ink lg:block">
          {cards.map((c, i) => {
            const isDone = isComplete(saved[c.entry.id]?.scores ?? {}, criteria);
            const active = i === index;
            return (
              <li key={c.entry.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-full items-center gap-3 border-b-2 border-dotted border-ink/40 px-2 py-2.5 text-left ${
                    active ? "bg-ink text-paper" : "hover:bg-sheet"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-6 w-6 shrink-0 place-items-center border-2 text-xs font-bold ${
                      active ? "border-paper" : "border-ink"
                    } ${isDone ? (active ? "bg-paper text-ink" : "bg-pink") : ""}`}
                  >
                    {isDone ? "✓" : ""}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{c.code}</span>
                    <span className={`block truncate text-sm ${active ? "text-paper/80" : "text-ink-soft"}`}>
                      {c.entry.title}
                    </span>
                  </span>
                  <span className="sr-only">{isDone ? ", puanlandı" : ", puanlanmadı"}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      {/* --------------------------------------------------------- puan kâğıdı */}
      <section aria-labelledby="sarki-baslik" className="min-w-0">
        <div className="grid gap-5 sm:grid-cols-[9rem_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.entry.coverUrl}
            alt=""
            className="aspect-square w-32 border-2 border-ink object-cover sm:w-full"
          />
          <div className="min-w-0">
            <p className="font-bold text-pink-deep">{card.code}</p>
            <h2 id="sarki-baslik" className="display mt-1 text-[clamp(2.25rem,5vw,3.25rem)]">
              {card.entry.title}
            </h2>
            <p className="mt-1 text-ink-soft">
              {blind ? "Sanatçı adı gizli" : card.entry.artistName}
              {card.entry.genre && <span className="ml-2 rounded-sm bg-ink/5 px-1.5 py-0.5 text-sm">{card.entry.genre}</span>}
            </p>
            <div className="mt-4">
              <PlayButton track={track} />
            </div>
          </div>
        </div>

        {card.entry.description && (
          <div className="mt-6 max-w-prose">
            <h3 className="font-semibold">Hikâyesi</h3>
            <p className="mt-1 whitespace-pre-line text-ink-soft">{card.entry.description}</p>
          </div>
        )}

        {!canScore && (
          <p className="notice mt-8">
            Puanlama, yönetici aşamayı “Jüri değerlendirmesi”ne aldığında açılır ve oylama başlayınca kapanır. Şu an
            şarkıları dinleyebilir, verdiğin puanları görebilirsin.
          </p>
        )}

        <form
          className="mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (dirty) save(true);
            else go(index + 1);
          }}
        >
          <div className="border-t-2 border-ink">
            {criteria.map((c) => (
              <fieldset key={c.id} className="border-b-2 border-dotted border-ink/40 py-4" disabled={!canScore || pending}>
                <legend className="float-left w-full">
                  <span className="font-semibold">{c.name}</span>
                  {c.weight !== 1 && (
                    <span className="ml-2 text-sm text-ink-soft">
                      ağırlık ×{c.weight.toLocaleString("tr-TR")}
                    </span>
                  )}
                  {c.description && <span className="block text-sm text-ink-soft">{c.description}</span>}
                </legend>
                <div className="clear-both flex flex-wrap gap-1.5 pt-3">
                  {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => {
                    const checked = draft.scores[c.id] === n;
                    return (
                      <label key={n} className="relative">
                        <input
                          type="radio"
                          name={`kriter-${c.id}`}
                          value={n}
                          checked={checked}
                          onChange={() => update({ scores: { ...draft.scores, [c.id]: n } })}
                          className="peer sr-only"
                        />
                        <span
                          className={`grid h-10 w-10 cursor-pointer place-items-center border-2 border-ink font-bold tabular-nums peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue peer-disabled:cursor-not-allowed ${
                            checked ? "bg-pink shadow-[2px_2px_0_var(--color-blue)]" : "bg-sheet hover:bg-paper"
                          }`}
                        >
                          {n}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-6">
            <label htmlFor="jury-note" className="field-label">Not</label>
            <textarea
              id="jury-note"
              className="input min-h-24"
              maxLength={1000}
              value={draft.note}
              disabled={!canScore || pending}
              onChange={(e) => update({ note: e.target.value })}
              placeholder="Örneğin: nakarat güçlü, miks biraz boğuk."
            />
            <span className="field-help">Notunu yalnızca sen ve yöneticiler görür.</span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 border-2 border-ink bg-sheet p-4">
            <p className="mr-auto">
              <span className="block text-sm text-ink-soft">Bu şarkıya verdiğin ağırlıklı ortalama</span>
              <span className="display text-5xl tabular-nums">{formatScore(average)}</span>
            </p>
            {canScore && (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-ghost" disabled={pending || !complete || !dirty} onClick={() => save(false)}>
                  Kaydet
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={pending || !complete || (!dirty && index === cards.length - 1)}
                >
                  {pending ? "Kaydediliyor…" : dirty ? "Kaydet ve sıradakine geç" : "Sıradakine geç"}
                </button>
              </div>
            )}
          </div>
          <p role="status" aria-live="polite" className="mt-3 min-h-6 text-sm font-semibold">
            {message ? (
              <span className={message.ok ? "" : "text-pink-deep"}>{message.text}</span>
            ) : canScore && !complete ? (
              <span className="text-ink-soft">Kaydetmek için her kritere bir puan ver.</span>
            ) : canScore && dirty ? (
              <span className="text-ink-soft">Kaydedilmemiş değişiklik var.</span>
            ) : null}
          </p>
        </form>
      </section>
    </div>
  );
}
