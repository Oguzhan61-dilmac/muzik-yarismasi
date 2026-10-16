"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { castVote } from "@/lib/actions";

export function VoteButton({
  entryId,
  myVote,
  loggedIn,
}: {
  entryId: string;
  myVote: string | null;
  loggedIn: boolean;
}) {
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!loggedIn) {
    return (
      <Link href={`/giris?next=${encodeURIComponent(pathname)}`} className="btn btn-ghost w-full">
        Oy vermek için giriş yap
      </Link>
    );
  }

  if (myVote === entryId) {
    return (
      <p className="btn btn-primary w-full cursor-default" aria-live="polite">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Oyun bu şarkıda
      </p>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await castVote(entryId);
            setMessage(res.ok ? null : { ok: false, text: res.message ?? "Oy kaydedilemedi." });
          })
        }
        className="btn btn-ghost w-full bg-sheet"
      >
        {pending ? "Kaydediliyor…" : myVote ? "Oyumu buna taşı" : "Oy ver"}
      </button>
      {message && (
        <p role="alert" className="mt-2 text-sm font-semibold text-pink-deep">
          {message.text}
        </p>
      )}
    </div>
  );
}
