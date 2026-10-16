"use client";

import { useActionState } from "react";
import { saveSettings } from "@/lib/admin-actions";
import { toLocalInput } from "@/lib/format";
import type { Settings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(saveSettings, null);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="s-title" className="field-label">Yarışmanın adı</label>
        <input id="s-title" name="title" className="input" defaultValue={settings.title} maxLength={80} required />
      </div>
      <div>
        <label htmlFor="s-tagline" className="field-label">Slogan</label>
        <input id="s-tagline" name="tagline" className="input" defaultValue={settings.tagline} maxLength={140} />
        <span className="field-help">Ana sayfada başlığın altında ve bağlantı önizlemelerinde görünür.</span>
      </div>
      <div>
        <label htmlFor="s-desc" className="field-label">Tanıtım metni</label>
        <textarea id="s-desc" name="description" className="input" defaultValue={settings.description} maxLength={2000} />
      </div>
      <div>
        <label htmlFor="s-rules" className="field-label">Kurallar</label>
        <textarea id="s-rules" name="rules" className="input min-h-48" defaultValue={settings.rules} maxLength={6000} />
        <span className="field-help">Her satır ayrı bir madde olarak listelenir.</span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="s-deadline" className="field-label">Son başvuru</label>
          <input id="s-deadline" name="submission_deadline" type="datetime-local" className="input"
            defaultValue={toLocalInput(settings.submissionDeadline)} />
          <span className="field-help">Türkiye saatiyle. Bilgi amaçlıdır; başvuruları aşamayı değiştirerek kapatırsın.</span>
        </div>
        <div>
          <label htmlFor="s-voting" className="field-label">Oylamanın bitişi</label>
          <input id="s-voting" name="voting_ends_at" type="datetime-local" className="input"
            defaultValue={toLocalInput(settings.votingEndsAt)} />
          <span className="field-help">Türkiye saatiyle. Oylamayı aşamayı “Sonuçlar”a alarak kapatırsın.</span>
        </div>
      </div>
      <div className="max-w-xs">
        <label htmlFor="s-max" className="field-label">Kişi başı en fazla şarkı</label>
        <input id="s-max" name="max_entries_per_user" type="number" min={1} max={10} className="input"
          defaultValue={settings.maxEntriesPerUser} />
      </div>
      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="blind_judging" defaultChecked={settings.blindJudging}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-pink)]" />
          <span>
            <span className="font-semibold">Kör değerlendirme</span>
            <span className="field-help mt-0">
              Jüri puanlarken sanatçı adını görmez, şarkılar “Eser 01, Eser 02” diye sıralanır.
            </span>
          </span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Kaydediliyor…" : "Bilgileri kaydet"}
        </button>
        {state && (
          <p role="status" className={`font-semibold ${state.ok ? "" : "text-pink-deep"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
