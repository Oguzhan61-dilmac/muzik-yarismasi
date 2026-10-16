import { getSettings } from "@/lib/data";
import { setPreviewPhase } from "@/lib/actions";
import { PHASE_LABEL } from "@/lib/format";
import { PHASES } from "@/lib/types";

/** Yalnızca Supabase bağlı değilken görünür. */
export async function PreviewBanner() {
  const { phase } = await getSettings();
  return (
    <div className="bg-ink text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
        <p className="mr-auto">
          <strong className="text-pink">Önizleme modu.</strong> Supabase henüz bağlı değil; site örnek verilerle
          çalışıyor ve hiçbir şey kaydedilmiyor. Her ekranı görmek için aşamayı değiştir:
        </p>
        <div className="flex flex-wrap gap-1">
          {PHASES.map((p) => (
            <form key={p} action={setPreviewPhase.bind(null, p)}>
              <button
                type="submit"
                aria-pressed={p === phase}
                className={`rounded-sm border px-2 py-1 font-semibold ${
                  p === phase ? "border-pink bg-pink text-ink" : "border-paper/40 hover:border-paper"
                }`}
              >
                {PHASE_LABEL[p]}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
