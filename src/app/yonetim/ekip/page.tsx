import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { InviteForm, RemoveMemberButton } from "@/components/admin/team";
import { Skeleton } from "@/components/page-shell";
import { getTeam } from "@/lib/data";
import type { Viewer } from "@/lib/types";

export const metadata: Metadata = { title: "Ekip" };

export default function TeamPage() {
  return (
    <Suspense fallback={<Skeleton lines={5} />}>
      <AdminShell next="/yonetim/ekip" adminOnly>
        {(viewer) => <Team viewer={viewer} />}
      </AdminShell>
    </Suspense>
  );
}

async function Team({ viewer }: { viewer: Viewer }) {
  const team = await getTeam();
  return (
    <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
      <section aria-labelledby="ekip">
        <h2 id="ekip" className="display text-4xl">Yarışma ekibi</h2>
        <p className="mb-5 mt-1 text-ink-soft">Jüri üyeleri şarkıları dinleyip puanlar; yöneticiler her şeyi yönetir.</p>
        <ul className="border-t-2 border-ink">
          {team.map((m) => (
            <li key={m.email} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b-2 border-dotted border-ink/40 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.name ?? m.email}</p>
                <p className="truncate text-sm text-ink-soft">
                  {m.name && <span className="mr-2">{m.email}</span>}
                  {!m.joined && "Henüz giriş yapmadı; ilk girişinde rolünü alacak."}
                </p>
              </div>
              <span className={`rounded-full border-2 px-2.5 py-0.5 text-sm font-bold ${m.role === "admin" ? "border-ink bg-ink text-paper" : "border-ink"}`}>
                {m.role === "admin" ? "Yönetici" : "Jüri"}
              </span>
              {m.owner ? (
                <span className="text-sm text-ink-soft">Site sahibi</span>
              ) : (
                m.email.toLowerCase() !== viewer.email?.toLowerCase() && <RemoveMemberButton email={m.email} />
              )}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="ekle">
        <h2 id="ekle" className="display mb-5 text-4xl">Ekibe ekle</h2>
        <InviteForm />
        <p className="mt-3 text-sm text-ink-soft">
          Kişi siteye daha önce giriş yaptıysa rolü hemen değişir. Yapmadıysa aynı Google adresiyle ilk girişinde
          otomatik olarak bu rolü alır.
        </p>
      </section>
    </div>
  );
}
