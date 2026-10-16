"use client";

import { useActionState, useState, useTransition } from "react";
import { inviteMember, removeMember } from "@/lib/admin-actions";

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteMember, null);
  return (
    <form action={action} className="panel space-y-4 p-5">
      <div>
        <label htmlFor="t-email" className="field-label">Google e-posta adresi</label>
        <input id="t-email" name="email" type="email" required className="input" placeholder="ornek@gmail.com" />
      </div>
      <fieldset>
        <legend className="field-label">Rol</legend>
        <div className="space-y-2">
          <label className="flex items-start gap-3">
            <input type="radio" name="role" value="jury" defaultChecked className="mt-1 h-5 w-5 accent-[var(--color-pink)]" />
            <span>
              <span className="font-semibold">Jüri</span>
              <span className="block text-sm text-ink-soft">Şarkıları dinler ve puanlar; başka değişiklik yapamaz.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="radio" name="role" value="admin" className="mt-1 h-5 w-5 accent-[var(--color-pink)]" />
            <span>
              <span className="font-semibold">Yönetici</span>
              <span className="block text-sm text-ink-soft">Aşamaları, finalistleri ve ekibi yönetir.</span>
            </span>
          </label>
        </div>
      </fieldset>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Ekleniyor…" : "Ekibe ekle"}
      </button>
      {state && (
        <p role="status" className={`font-semibold ${state.ok ? "" : "text-pink-deep"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}

export function RemoveMemberButton({ email }: { email: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      <button
        type="button"
        disabled={pending}
        className="btn btn-quiet min-h-9 text-sm"
        onClick={() => {
          if (!confirm(`${email} ekipten çıkarılsın mı?`)) return;
          start(async () => {
            const res = await removeMember(email);
            setError(res.ok ? null : res.message);
          });
        }}
      >
        {pending ? "Çıkarılıyor…" : "Ekipten çıkar"}
      </button>
      {error && <span role="alert" className="block text-sm font-semibold text-pink-deep">{error}</span>}
    </span>
  );
}
