"use client";

import { useState, useTransition } from "react";
import { withdrawEntry } from "@/lib/actions";

export function WithdrawButton({ entryId, title }: { entryId: string; title: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="btn btn-quiet"
        onClick={() => {
          if (!confirm(`“${title}” başvurusunu geri çekmek istediğine emin misin? Dosyaların silinir.`)) return;
          start(async () => {
            const res = await withdrawEntry(entryId);
            if (!res.ok) setError(res.message);
          });
        }}
      >
        {pending ? "Geri çekiliyor…" : "Başvuruyu geri çek"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-sm font-semibold text-pink-deep">
          {error}
        </p>
      )}
    </div>
  );
}
