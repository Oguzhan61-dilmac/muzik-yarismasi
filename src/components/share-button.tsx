"use client";

import { useState } from "react";

export function ShareButton({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${title} finalde, oyunu bekliyor!`, url });
        return;
      } catch {
        // kullanıcı paylaşımı iptal etti; kopyalamaya geç
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button type="button" onClick={share} className="btn btn-ghost" aria-live="polite">
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M12 3v12M7 8l5-5 5 5M5 13v6h14v-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {copied ? "Bağlantı kopyalandı" : "Paylaş"}
    </button>
  );
}
