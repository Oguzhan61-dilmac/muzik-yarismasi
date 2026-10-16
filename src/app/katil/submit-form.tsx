"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { submitEntry } from "@/lib/actions";
import { isPreview, SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";
import { AUDIO_FORMATS, COVER_FORMATS, GENRES, LIMITS, extensionOf, formatBytes } from "@/lib/limits";
import { getBrowserClient } from "@/lib/supabase/client";

type Stage = "idle" | "uploading" | "saving";

function storageError(xhr: XMLHttpRequest): string {
  let msg = "";
  try {
    msg = String(JSON.parse(xhr.responseText)?.message ?? "");
  } catch {}
  if (xhr.status === 413 || /size|large/i.test(msg)) return "Dosya çok büyük.";
  if (xhr.status === 415 || /mime|type/i.test(msg)) return "Dosya biçimi kabul edilmiyor.";
  if (xhr.status === 401 || /jwt|token/i.test(msg)) return "Oturumunun süresi dolmuş. Sayfayı yenileyip tekrar giriş yap.";
  if (xhr.status === 403 || /security|policy/i.test(msg)) return "Yükleme izni yok; başvurular kapanmış olabilir.";
  return `Yükleme başarısız oldu${msg ? `: ${msg}` : "."}`;
}

async function upload(
  bucket: "audio" | "covers",
  path: string,
  file: File,
  contentType: string,
  onProgress: (p: number) => void,
): Promise<void> {
  const { data } = await getBrowserClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Oturumunun süresi dolmuş. Sayfayı yenileyip tekrar giriş yap.");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(storageError(xhr))));
    xhr.onerror = () => reject(new Error("Bağlantı koptu. İnternetini kontrol edip tekrar dene."));
    xhr.send(file);
  });
  onProgress(1);
}

function Progress({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-sm font-semibold">
        <span>{label}</span>
        <span className="tabular-nums">%{pct}</span>
      </div>
      <div
        className="mt-1 h-3 border-2 border-ink bg-sheet"
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-pink transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-sm tabular-nums ${value.length > max * 0.9 ? "text-pink-deep" : "text-ink-soft"}`}>
      {value.length}/{max}
    </span>
  );
}

export function SubmitForm({ userId }: { userId: string }) {
  const router = useRouter();
  const ids = useId();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [coverWarning, setCoverWarning] = useState<string | null>(null);
  const [owns, setOwns] = useState(false);
  const [rules, setRules] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState({ cover: 0, audio: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (coverUrl) URL.revokeObjectURL(coverUrl);
  }, [coverUrl]);
  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  function pickAudio(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!(extensionOf(file.name) in AUDIO_FORMATS)) {
      setError("Şarkı MP3 ya da M4A biçiminde olmalı.");
      return;
    }
    if (file.size > LIMITS.audioBytes) {
      setError(`Şarkı dosyası ${formatBytes(file.size)}; en fazla 10 MB olabilir. Şarkıyı 192 kbps MP3 olarak dışa aktarmayı dene.`);
      return;
    }
    setAudio(file);
    setAudioUrl(URL.createObjectURL(file));
  }

  function pickCover(file: File | undefined) {
    setError(null);
    setCoverWarning(null);
    if (!file) return;
    if (!(extensionOf(file.name) in COVER_FORMATS)) {
      setError("Kapak görseli JPG, PNG ya da WEBP olmalı.");
      return;
    }
    if (file.size > LIMITS.coverBytes) {
      setError(`Kapak görseli ${formatBytes(file.size)}; en fazla 3 MB olabilir.`);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      if (ratio < 0.95 || ratio > 1.05) {
        setCoverWarning("Görsel kare değil; kenarlarından kırpılarak gösterilecek.");
      } else if (img.naturalWidth < 600) {
        setCoverWarning("Görsel küçük; büyük ekranlarda bulanık görünebilir.");
      }
    };
    img.src = url;
    setCover(file);
    setCoverUrl(url);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (isPreview) {
      setError("Önizleme modunda başvuru kaydedilmez. Supabase'i bağladığında bu form çalışacak.");
      return;
    }
    if (!title.trim() || !artist.trim()) return setError("Şarkı adı ve sanatçı adı zorunlu.");
    if (!audio) return setError("Şarkı dosyanı seç.");
    if (!cover) return setError("Kapak görselini seç.");
    if (!owns || !rules) return setError("Göndermeden önce iki onay kutusunu da işaretle.");

    const entryId = crypto.randomUUID();
    const audioExt = extensionOf(audio.name);
    const coverExt = extensionOf(cover.name);
    const audioPath = `${userId}/${entryId}.${audioExt}`;
    const coverPath = `${userId}/${entryId}.${coverExt}`;
    const uploaded: { bucket: "audio" | "covers"; path: string }[] = [];

    setStage("uploading");
    setProgress({ cover: 0, audio: 0 });
    try {
      await upload("covers", coverPath, cover, COVER_FORMATS[coverExt], (p) => setProgress((s) => ({ ...s, cover: p })));
      uploaded.push({ bucket: "covers", path: coverPath });
      await upload("audio", audioPath, audio, AUDIO_FORMATS[audioExt], (p) => setProgress((s) => ({ ...s, audio: p })));
      uploaded.push({ bucket: "audio", path: audioPath });

      setStage("saving");
      const res = await submitEntry({
        id: entryId,
        title,
        artistName: artist,
        genre,
        description,
        audioPath,
        coverPath,
      });
      if (!res.ok) throw new Error(res.message);
      router.push("/basvurum?gonderildi=1");
    } catch (err) {
      const supabase = getBrowserClient();
      await Promise.all(uploaded.map((u) => supabase.storage.from(u.bucket).remove([u.path]).catch(() => null)));
      setError(err instanceof Error ? err.message : "Bir şeyler ters gitti, tekrar dene.");
      setStage("idle");
    }
  }

  const busy = stage !== "idle";

  return (
    <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_22rem]" noValidate>
      <fieldset disabled={busy} className="min-w-0 space-y-6">
        <legend className="sr-only">Şarkı bilgileri</legend>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={`${ids}-title`} className="field-label">Şarkının adı</label>
            <Counter value={title} max={LIMITS.title} />
          </div>
          <input id={`${ids}-title`} className="input" value={title} maxLength={LIMITS.title} required
            onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={`${ids}-artist`} className="field-label">Sanatçı ya da grup adı</label>
            <Counter value={artist} max={LIMITS.artistName} />
          </div>
          <input id={`${ids}-artist`} className="input" value={artist} maxLength={LIMITS.artistName} required
            onChange={(e) => setArtist(e.target.value)} autoComplete="off" />
          <span className="field-help">Finalde ve sonuç listesinde bu ad görünür.</span>
        </div>
        <div>
          <label htmlFor={`${ids}-genre`} className="field-label">Tür <span className="font-normal text-ink-soft">(isteğe bağlı)</span></label>
          <input id={`${ids}-genre`} className="input" list={`${ids}-genres`} value={genre} maxLength={LIMITS.genre}
            onChange={(e) => setGenre(e.target.value)} autoComplete="off" />
          <datalist id={`${ids}-genres`}>
            {GENRES.map((g) => <option key={g} value={g} />)}
          </datalist>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={`${ids}-desc`} className="field-label">Şarkının hikâyesi <span className="font-normal text-ink-soft">(isteğe bağlı)</span></label>
            <Counter value={description} max={LIMITS.description} />
          </div>
          <textarea id={`${ids}-desc`} className="input" value={description} maxLength={LIMITS.description}
            onChange={(e) => setDescription(e.target.value)} />
          <span className="field-help">Kısa bir not: ne zaman, nasıl, kimle yaptın?</span>
        </div>

        <div>
          <label htmlFor={`${ids}-audio`} className="field-label">Şarkı dosyası</label>
          <input id={`${ids}-audio`} type="file" accept=".mp3,.m4a,audio/mpeg,audio/mp4"
            onChange={(e) => pickAudio(e.target.files?.[0])}
            className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-sm file:border-2 file:border-ink file:bg-sheet file:px-3 file:py-2 file:font-semibold file:text-ink hover:file:bg-pink/10" />
          <span className="field-help">MP3 ya da M4A, en fazla 10 MB.</span>
          {audio && audioUrl && (
            <div className="mt-3 panel p-3">
              <p className="truncate text-sm font-semibold">{audio.name} <span className="font-normal text-ink-soft">{formatBytes(audio.size)}</span></p>
              <audio src={audioUrl} controls preload="metadata" className="mt-2 w-full" />
            </div>
          )}
        </div>

        <div className="space-y-3 border-t-2 border-dotted border-ink/40 pt-6">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={owns} onChange={(e) => setOwns(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--color-pink)]" />
            <span>Bu şarkı bana ya da grubuma ait; sitede yayınlanmasına ve oylamaya açılmasına izin veriyorum.</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--color-pink)]" />
            <span>
              <Link href="/kurallar" target="_blank">Yarışma kurallarını</Link> okudum ve kabul ediyorum.
            </span>
          </label>
        </div>
      </fieldset>

      <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <div>
          <span className="field-label" id={`${ids}-cover-label`}>Kapak görseli</span>
          <label
            htmlFor={`${ids}-cover`}
            className={`relative grid aspect-square w-full cursor-pointer place-items-center overflow-hidden border-2 border-ink ${
              coverUrl ? "bg-sheet" : "border-dashed bg-sheet hover:bg-pink/10"
            } ${busy ? "pointer-events-none" : ""}`}
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="Seçilen kapak görseli" className="h-full w-full object-cover" />
            ) : (
              <span className="px-6 text-center">
                <span className="display block text-3xl">Kapak seç</span>
                <span className="mt-1 block text-sm text-ink-soft">Kare JPG, PNG ya da WEBP, en fazla 3 MB</span>
              </span>
            )}
          </label>
          <input id={`${ids}-cover`} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            aria-labelledby={`${ids}-cover-label`} className="sr-only" disabled={busy}
            onChange={(e) => pickCover(e.target.files?.[0])} />
          {cover && (
            <p className="mt-2 text-sm text-ink-soft">
              {cover.name}, {formatBytes(cover.size)}{" "}
              <label htmlFor={`${ids}-cover`} className="cursor-pointer font-semibold text-ink underline decoration-pink decoration-2">değiştir</label>
            </p>
          )}
          {coverWarning && <p className="mt-1 text-sm font-semibold text-pink-deep">{coverWarning}</p>}
        </div>

        {stage === "uploading" && (
          <div className="space-y-3" aria-live="polite">
            <Progress label="Kapak yükleniyor" value={progress.cover} />
            <Progress label="Şarkı yükleniyor" value={progress.audio} />
          </div>
        )}
        {error && <p role="alert" className="notice notice-error">{error}</p>}

        <button type="submit" disabled={busy} className="btn btn-primary w-full text-lg">
          {stage === "uploading" ? "Yükleniyor…" : stage === "saving" ? "Kaydediliyor…" : "Başvuruyu gönder"}
        </button>
        <p className="text-sm text-ink-soft">
          Gönderdikten sonra başvurular kapanana kadar geri çekip yeniden gönderebilirsin.
        </p>
      </div>
    </form>
  );
}
