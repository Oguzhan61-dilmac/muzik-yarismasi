import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { JuryBoard } from "@/components/jury/jury-board";
import { Skeleton } from "@/components/page-shell";
import { getCriteria, getJuryQueue, getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Puanla" };

export default function ScorePage() {
  return (
    <Suspense fallback={<Skeleton lines={8} />}>
      <AdminShell next="/yonetim/puanla">
        {() => <Board />}
      </AdminShell>
    </Suspense>
  );
}

async function Board() {
  const [settings, criteria, cards] = await Promise.all([getSettings(), getCriteria(), getJuryQueue()]);
  const canScore = settings.phase === "review";
  return (
    <div>
      <p className="mb-8 max-w-2xl text-ink-soft">
        Her şarkıyı dinle ve {criteria.length} kritere 1 ile 10 arasında puan ver.
        {settings.blindJudging && " Adil bir değerlendirme için sanatçı adları gizli."} Verdiğin puanları diğer jüri
        üyeleri göremez; yarışma ekibi tüm jürinin ortalamasına bakarak finalistleri belirler.
      </p>
      {criteria.length === 0 ? (
        <p className="notice">Henüz değerlendirme kriteri yok. Yönetici, Yarışma sekmesinden kriter eklemeli.</p>
      ) : (
        <JuryBoard cards={cards} criteria={criteria} canScore={canScore} blind={settings.blindJudging} />
      )}
    </div>
  );
}
