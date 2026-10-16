"use client";

import { useState, useTransition } from "react";
import { deleteEntry, setEntryStatus } from "@/lib/admin-actions";
import type { EntryStatus } from "@/lib/types";

export function EntryActions({ entryId, title, status }: { entryId: string; title: string; status: EntryStatus }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const res = await fn();
      setError(res.ok ? null : (res.message ?? "İşlem başarısız oldu."));
    });

  return (
    <div className="flex flex-col items-stretch gap-2">
      {status === "submitted" && (
        <>
          <button type="button" disabled={pending} className="btn btn-primary min-h-10"
            onClick={() => run(() => setEntryStatus(entryId, "finalist"))}>
            Finale al
          </button>
          <button type="button" disabled={pending} className="btn btn-quiet min-h-9"
            onClick={() => run(() => setEntryStatus(entryId, "disqualified"))}>
            Yarışma dışı bırak
          </button>
        </>
      )}
      {status === "finalist" && (
        <button type="button" disabled={pending} className="btn btn-ghost min-h-10 bg-sheet"
          onClick={() => run(() => setEntryStatus(entryId, "submitted"))}>
          Finalden çıkar
        </button>
      )}
      {status === "disqualified" && (
        <button type="button" disabled={pending} className="btn btn-ghost min-h-10 bg-sheet"
          onClick={() => run(() => setEntryStatus(entryId, "submitted"))}>
          Yarışmaya geri al
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        className="btn btn-quiet min-h-9 text-sm"
        onClick={() => {
          if (confirm(`“${title}” başvurusu ve dosyaları kalıcı olarak silinsin mi?`)) run(() => deleteEntry(entryId));
        }}
      >
        Sil
      </button>
      {error && (
        <p role="alert" className="text-sm font-semibold text-pink-deep">
          {error}
        </p>
      )}
    </div>
  );
}
