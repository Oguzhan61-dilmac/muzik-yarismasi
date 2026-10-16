import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell, Skeleton } from "@/components/page-shell";
import { getCriteria, getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Kurallar" };

export default function RulesPage() {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <Rules />
    </Suspense>
  );
}

async function Rules() {
  const [settings, criteria] = await Promise.all([getSettings(), getCriteria()]);
  const rules = settings.rules.split("\n").map((r) => r.trim()).filter(Boolean);
  return (
    <PageShell title="Kurallar" lead="Başvurmadan önce lütfen hepsini oku." narrow>
      {rules.length ? (
        <ol className="border-t-2 border-ink">
          {rules.map((rule, i) => (
            <li key={i} className="grid grid-cols-[3rem_1fr] gap-3 border-b-2 border-dotted border-ink/40 py-4 text-lg">
              <span className="display text-3xl tabular-nums">{i + 1}</span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="notice">Kurallar yakında burada yayınlanacak.</p>
      )}

      {criteria.length > 0 && (
        <>
          <h2 className="display mt-14 text-4xl">Jüri nasıl puanlar?</h2>
          <p className="mt-3 text-ink-soft">
            Her jüri üyesi şarkını aşağıdaki kriterlere göre 1 ile 10 arasında puanlar
            {settings.blindJudging && "; puanlarken adını görmez"}. Finalistler tüm jürinin ortalamasına göre belirlenir.
          </p>
          <ul className="mt-5 border-t-2 border-ink">
            {criteria.map((c) => (
              <li key={c.id} className="border-b-2 border-dotted border-ink/40 py-3">
                <span className="font-semibold">{c.name}</span>
                {c.weight !== 1 && (
                  <span className="ml-2 text-sm text-ink-soft">
                    {c.weight < 1 ? "daha az etkili" : "daha çok etkili"} (×{c.weight.toLocaleString("tr-TR")})
                  </span>
                )}
                {c.description && <span className="block text-ink-soft">{c.description}</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="display mt-14 text-4xl">Dosya gereksinimleri</h2>
      <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-[10rem_1fr]">
        <dt className="font-semibold">Şarkı</dt>
        <dd className="text-ink-soft">MP3 ya da M4A, en fazla 10 MB. 192 kbps MP3 ile yaklaşık 7 dakikalık bir şarkı sığar.</dd>
        <dt className="font-semibold">Kapak görseli</dt>
        <dd className="text-ink-soft">JPG, PNG ya da WEBP, en fazla 3 MB. Kare olmalı; en az 1000 × 1000 piksel önerilir.</dd>
        <dt className="font-semibold">Başvuru sayısı</dt>
        <dd className="text-ink-soft">Kişi başı en fazla {settings.maxEntriesPerUser} şarkı.</dd>
      </dl>
    </PageShell>
  );
}
