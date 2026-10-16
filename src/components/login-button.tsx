"use client";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { isPreview } from "@/lib/env";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.6 11.6 0 0 0 12 0 12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

export function LoginButton({ next = "/", label = "Google ile devam et" }: { next?: string; label?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    if (isPreview) {
      setError("Önizleme modunda giriş yok; zaten örnek bir kullanıcı olarak geziyorsun.");
      return;
    }
    setPending(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await getBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setPending(false);
      setError("Google girişi başlatılamadı. Biraz sonra tekrar dene.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={signIn} disabled={pending} className="btn btn-primary">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white">
          <GoogleMark />
        </span>
        {pending ? "Google'a yönlendiriliyor…" : label}
      </button>
      {error && (
        <p role="alert" className="text-sm font-semibold text-pink-deep">
          {error}
        </p>
      )}
    </div>
  );
}
