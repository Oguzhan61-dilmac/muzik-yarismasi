import type { EntryStatus, Phase } from "./types";

export const PHASE_LABEL: Record<Phase, string> = {
  upcoming: "Yakında",
  submissions: "Başvuru",
  review: "Jüri değerlendirmesi",
  voting: "Final oylaması",
  results: "Sonuçlar",
};

export const PHASE_HELP: Record<Phase, string> = {
  upcoming: "Site açık ama başvurular henüz alınmıyor.",
  submissions: "Herkes Google ile giriş yapıp şarkısını gönderebilir.",
  review: "Başvurular kapanır. Jüri şarkıları puanlar; sen puan sıralamasına bakarak finalistleri seçersin.",
  voting: "Finalistler herkese açılır, giriş yapan herkes bir oy verir.",
  results: "Oylama kapanır, sıralama ve oy sayıları herkese açılır.",
};

export const STATUS_LABEL: Record<EntryStatus, string> = {
  submitted: "Değerlendirmede",
  finalist: "Finalist",
  disqualified: "Yarışma dışı",
};

const TZ = "Europe/Istanbul";

export function formatDate(iso: string | null, withTime = true): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso));
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(iso));
}

/** ISO → <input type="datetime-local"> değeri (İstanbul saatiyle). */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
  return parts.replace(" ", "T");
}

/** <input type="datetime-local"> değeri (İstanbul saati) → ISO. Türkiye UTC+3, yaz saati yok. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function plural(n: number, word: string): string {
  return `${n.toLocaleString("tr-TR")} ${word}`;
}
