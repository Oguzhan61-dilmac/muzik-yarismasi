"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteCriterion, saveCriterion } from "@/lib/admin-actions";
import type { Criterion } from "@/lib/types";

function CriterionForm({ criterion, onDone }: { criterion?: Criterion; onDone?: () => void }) {
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveCriterion>> | null, form: FormData) => {
    const res = await saveCriterion(prev, form);
    if (res.ok) onDone?.();
    return res;
  }, null);
  const prefix = criterion ? `k-${criterion.id}` : "k-yeni";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_6rem]">
      {criterion && <input type="hidden" name="id" value={criterion.id} />}
      <div>
        <label htmlFor={`${prefix}-ad`} className="field-label">Kriter</label>
        <input id={`${prefix}-ad`} name="name" className="input" defaultValue={criterion?.name} maxLength={60} required
          placeholder="Örneğin: Sahne enerjisi" />
      </div>
      <div>
        <label htmlFor={`${prefix}-agirlik`} className="field-label">Ağırlık</label>
        <input id={`${prefix}-agirlik`} name="weight" className="input" inputMode="decimal"
          defaultValue={criterion ? criterion.weight.toLocaleString("tr-TR") : "1"} required />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${prefix}-aciklama`} className="field-label">Jüriye açıklama</label>
        <input id={`${prefix}-aciklama`} name="description" className="input" defaultValue={criterion?.description ?? ""}
          maxLength={300} placeholder="Jüri bu kriterde neye bakmalı?" />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn btn-primary min-h-10">
          {pending ? "Kaydediliyor…" : criterion ? "Kaydet" : "Kriteri ekle"}
        </button>
        {onDone && criterion && (
          <button type="button" className="btn btn-quiet min-h-10" onClick={onDone}>Vazgeç</button>
        )}
        {state && !state.ok && <p role="alert" className="text-sm font-semibold text-pink-deep">{state.message}</p>}
      </div>
    </form>
  );
}

export function CriteriaEditor({ criteria, scoringStarted }: { criteria: Criterion[]; scoringStarted: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);

  return (
    <div>
      {scoringStarted && (
        <p className="notice mb-5">
          Jüri puanlamaya başladı. Kriter eklersen jürinin daha önce puanladığı şarkılara dönüp yeni kritere de puan
          vermesi gerekir; kriter silersen o kritere verilen puanlar da silinir.
        </p>
      )}
      <ul className="border-t-2 border-ink">
        {criteria.map((c) => (
          <li key={c.id} className="border-b-2 border-dotted border-ink/40 py-3">
            {editing === c.id ? (
              <CriterionForm criterion={c} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {c.name}
                    <span className="ml-2 text-sm font-normal text-ink-soft">
                      ağırlık ×{c.weight.toLocaleString("tr-TR")}
                      {totalWeight > 0 && ` (%${Math.round((c.weight / totalWeight) * 100)})`}
                    </span>
                  </p>
                  {c.description && <p className="text-sm text-ink-soft">{c.description}</p>}
                </div>
                <button type="button" className="btn btn-quiet min-h-9 text-sm" onClick={() => setEditing(c.id)}>
                  Düzenle
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="btn btn-quiet min-h-9 text-sm"
                  onClick={() => {
                    const warn = scoringStarted ? " Bu kritere verilmiş tüm jüri puanları da silinecek." : "";
                    if (!confirm(`“${c.name}” kriteri silinsin mi?${warn}`)) return;
                    start(async () => {
                      const res = await deleteCriterion(c.id);
                      setError(res.ok ? null : res.message);
                    });
                  }}
                >
                  Sil
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-pink-deep">{error}</p>}
      <details className="mt-5">
        <summary className="cursor-pointer font-semibold">Yeni kriter ekle</summary>
        <div className="mt-4">
          <CriterionForm />
        </div>
      </details>
      <p className="mt-4 text-sm text-ink-soft">
        Jüri her kritere 1–10 arası puan verir. Şarkının jüri puanı, kriterlerin ağırlıklı ortalamasının tüm jüri
        üyelerindeki ortalamasıdır. Ağırlığı 0,5 olan bir kriter, ağırlığı 1 olanın yarısı kadar etkiler.
      </p>
    </div>
  );
}
