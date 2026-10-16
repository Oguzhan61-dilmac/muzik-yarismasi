import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { CriteriaEditor } from "@/components/admin/criteria-editor";
import { PhaseControl } from "@/components/admin/phase-control";
import { SettingsForm } from "@/components/admin/settings-form";
import { Skeleton } from "@/components/page-shell";
import { getCriteria, getJuryProgress, getSettings, getStats } from "@/lib/data";

export const metadata: Metadata = { title: "Yönetim" };

export default function AdminPage() {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <AdminShell next="/yonetim" adminOnly>
        {() => <Overview />}
      </AdminShell>
    </Suspense>
  );
}

async function Overview() {
  const [settings, stats, criteria, progress] = await Promise.all([
    getSettings(),
    getStats(),
    getCriteria(),
    getJuryProgress(),
  ]);
  const toScore = stats.entries - stats.disqualified;
  const scoringStarted = progress.some((p) => p.completed > 0);
  return (
    <div className="grid gap-x-12 gap-y-14 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-14">
        <section aria-labelledby="asama">
          <h2 id="asama" className="display text-4xl">Aşama</h2>
          <p className="mb-5 mt-1 text-ink-soft">
            {stats.entries.toLocaleString("tr-TR")} başvuru, {stats.finalists.toLocaleString("tr-TR")} finalist,{" "}
            {stats.votes.toLocaleString("tr-TR")} oy.
          </p>
          <PhaseControl current={settings.phase} finalists={stats.finalists} />
        </section>

        <section aria-labelledby="juri">
          <h2 id="juri" className="display text-4xl">Jüri ilerlemesi</h2>
          <p className="mb-4 mt-1 text-ink-soft">
            Her jüri üyesinin tüm kriterleriyle puanladığı şarkı sayısı. Puanlama yalnızca Jüri değerlendirmesi
            aşamasında açıktır.
          </p>
          {progress.length === 0 ? (
            <p className="notice">
              Henüz jüri üyesi yok. <Link href="/yonetim/ekip">Ekip</Link> sekmesinden jürinin Google adreslerini ekle.
            </p>
          ) : (
            <ul className="border-t-2 border-ink">
              {progress.map((p) => (
                <li key={p.email ?? p.name} className="border-b-2 border-dotted border-ink/40 py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 truncate font-semibold">{p.name ?? p.email}</span>
                    <span className="shrink-0 tabular-nums">
                      {p.completed} / {toScore}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-ink/10" aria-hidden="true">
                    <div className="h-full bg-pink" style={{ width: `${toScore ? Math.min(100, (p.completed / toScore) * 100) : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4">
            <Link href="/yonetim/basvurular?sira=puan">Puan sıralamasını gör ve finalistleri seç</Link>
          </p>
        </section>

        <section aria-labelledby="kriterler">
          <h2 id="kriterler" className="display mb-5 text-4xl">Değerlendirme kriterleri</h2>
          <CriteriaEditor criteria={criteria} scoringStarted={scoringStarted} />
        </section>
      </div>

      <section aria-labelledby="bilgiler">
        <h2 id="bilgiler" className="display mb-5 text-4xl">Yarışma bilgileri</h2>
        <SettingsForm settings={settings} />
      </section>
    </div>
  );
}
