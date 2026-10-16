// İstemci ve sunucunun ortak kullandığı sınırlar (veritabanındaki kısıtlarla aynı).

export const LIMITS = {
  title: 80,
  artistName: 60,
  genre: 40,
  aiTools: 120,
  description: 600,
  // Oylamada şarkılar çok dinlenir; Supabase ücretsiz planının aylık veri çıkışı sınırlı olduğu için 10 MB.
  audioBytes: 10 * 1024 * 1024,
  coverBytes: 3 * 1024 * 1024,
} as const;

export const AUDIO_FORMATS: Record<string, string> = { mp3: "audio/mpeg", m4a: "audio/mp4" };
export const COVER_FORMATS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const GENRES = [
  "Pop",
  "Rock",
  "Rap / Hip-hop",
  "Elektronik",
  "Akustik",
  "Türk halk müziği",
  "Türk sanat müziği",
  "Caz",
  "Lo-fi",
  "Enstrümantal",
  "Diğer",
];

export function extensionOf(fileName: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(fileName);
  return m ? m[1].toLowerCase() : "";
}

export function formatBytes(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.round(n / 1024)} KB`;
}

/** Yolun "<kullanıcı-id>/<başvuru-id>.<uzantı>" biçiminde olduğunu doğrular. */
export function isValidStoragePath(path: string, userId: string, entryId: string, formats: Record<string, string>) {
  const prefix = `${userId}/${entryId}.`;
  return path.startsWith(prefix) && path.slice(prefix.length) in formats;
}
