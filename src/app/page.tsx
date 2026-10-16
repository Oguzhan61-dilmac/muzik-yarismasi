import Link from "next/link";
import { Suspense } from "react";
import { FinalistGrid, Paragraphs, ResultsChart } from "@/components/entries";
import { Skeleton, SectionTitle } from "@/components/page-shell";
import { PhaseTracklist } from "@/components/phase-tracklist";
import { PosterArt } from "@/components/poster-art";
import { getFinalists, getMyEntries, getMyVote, getResults, getSettings, getViewer } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { Settings } from "@/lib/types";

export default function HomePage() {
  return (
    <Suspense fallback={<Skeleton lines={4} />}>
      <Home />
    </Suspense>
  );
}

function statusLine(s: Settings): { headline: string; detail?: string } {
  switch (s.phase) {
    case "upcoming":
      return { headline: "Başvurular yakında açılıyor." };
    case "submissions":
      return {
        headline: "Başvurular açık.",
        detail: s.submissionDeadline ? `Son gün ${formatDate(s.submissionDeadline)}.` : undefined,
      };
    case "review":
      return { headline: "Başvurular kapandı, jüri puanlıyor.", detail: "Finalistler oylama başlayınca burada." };
    case "voting":
      return {
        headline: "Final oylaması başladı.",
        detail: s.votingEndsAt ? `Oylamanın bitişi ${formatDate(s.votingEndsAt)}.` : undefined,
      };
    case "results":
      return { headline: "Sonuçlar açıklandı." };
  }
}

async function Home() {
  const [settings, viewer] = await Promise.all([getSettings(), getViewer()]);
  const { phase } = settings;
  const myEntries = viewer && phase === "submissions" ? await getMyEntries() : [];
  const status = statusLine(settings);

  return (
    <>
      {/* Afiş */}
      <section className="relative overflow-hidden border-b-2 border-ink">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:py-16 md:grid-cols-[1.25fr_1fr] md:gap-4">
          <div className="relative z-10">
            <p className="text-lg font-semibold">
              {status.headline}
              {status.detail && <span className="font-normal text-ink-soft"> {status.detail}</span>}
            </p>
            <h1 className="display misprint mt-4 text-[clamp(3.75rem,11vw,8.5rem)] [overflow-wrap:anywhere]">
              {settings.title}
            </h1>
            {settings.tagline && <p className="mt-5 max-w-xl text-xl">{settings.tagline}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {phase === "submissions" &&
                (myEntries.length ? (
                  <Link href="/basvurum" className="btn btn-primary text-lg">
                    Başvurunu gör
                  </Link>
                ) : (
                  <Link href="/katil" className="btn btn-primary text-lg">
                    Şarkını gönder
                  </Link>
                ))}
              {phase === "voting" && (
                <a href="#finalistler" className="btn btn-primary text-lg">
                  Finalistleri dinle
                </a>
              )}
              {phase === "results" && (
                <a href="#sonuclar" className="btn btn-primary text-lg">
                  Sıralamayı gör
                </a>
              )}
              <Link href="/kurallar" className="btn btn-ghost text-lg">
                Kuralları oku
              </Link>
            </div>
          </div>
          <PosterArt className="mx-auto max-w-[22rem] md:max-w-none" />
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:space-y-20">
        {phase === "voting" && <Finalists loggedIn={Boolean(viewer)} />}
        {phase === "results" && <Results />}

        <section aria-labelledby="takvim" className="grid gap-10 md:grid-cols-[1fr_1.3fr]">
          <div>
            <SectionTitle id="takvim">Yarışma takvimi</SectionTitle>
            <Paragraphs text={settings.description} className="max-w-prose text-lg" />
          </div>
          <div className="md:pt-3">
            <PhaseTracklist settings={settings} />
          </div>
        </section>

        {(phase === "upcoming" || phase === "submissions") && (
          <section aria-labelledby="katilim">
            <SectionTitle id="katilim">Katılmak için gerekenler</SectionTitle>
            <ul className="grid gap-px border-2 border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Yapay zekâyla ürettiğin şarkı", "Suno, Udio ya da başka bir araçla senin ürettiğin bir şarkı. MP3 ya da M4A, en fazla 10 MB."],
                ["Kapak görselin", "Kare bir JPG, PNG ya da WEBP, en fazla 3 MB. Yapay zekâyla da üretebilirsin; finalde şarkının yüzü bu olacak."],
                ["Kullandığın araçlar", "Başvururken müzik, söz ve kapak için hangi yapay zekâ araçlarını kullandığını yazarsın."],
                ["Google hesabın", "Başvuru ve oy için Google ile giriş yapılır; şifre gerekmez."],
              ].map(([t, d]) => (
                <li key={t} className="bg-sheet p-5">
                  <p className="display text-2xl">{t}</p>
                  <p className="mt-2 text-ink-soft">{d}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

async function Finalists({ loggedIn }: { loggedIn: boolean }) {
  const [entries, myVote] = await Promise.all([getFinalists(), getMyVote()]);
  const voted = entries.find((e) => e.id === myVote);
  return (
    <section aria-labelledby="finalistler">
      <SectionTitle id="finalistler">Finalistler</SectionTitle>
      <p className="-mt-3 mb-10 max-w-2xl text-lg text-ink-soft">
        {voted
          ? `Oyunu “${voted.title}” için kullandın. Oylama bitene kadar başka bir şarkıya taşıyabilirsin.`
          : "Hepsini dinle, en sevdiğine oyunu ver. Her Google hesabı bir oy kullanır."}
      </p>
      {entries.length ? (
        <FinalistGrid entries={entries} myVote={myVote} loggedIn={loggedIn} voting />
      ) : (
        <p className="notice">Finalistler henüz yayınlanmadı.</p>
      )}
    </section>
  );
}

async function Results() {
  const entries = await getResults();
  return (
    <section aria-labelledby="sonuclar">
      <SectionTitle id="sonuclar">Sıralama</SectionTitle>
      {entries.length ? <ResultsChart entries={entries} /> : <p className="notice">Sonuçlar hazırlanıyor.</p>}
    </section>
  );
}
