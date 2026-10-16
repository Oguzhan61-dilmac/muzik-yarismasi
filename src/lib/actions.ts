"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { createClient } from "./supabase/server";
import { getCriteria, getSettings, getViewer, previewScores } from "./data";
import { isPreview } from "./env";
import { PREVIEW_PHASE_COOKIE, PREVIEW_SCORES_COOKIE, PREVIEW_VOTE_COOKIE } from "./demo";
import { AUDIO_FORMATS, COVER_FORMATS, LIMITS, isValidStoragePath } from "./limits";
import { PHASES, isStaff, type ActionResult, type Phase } from "./types";

const PREVIEW_MESSAGE = "Önizleme modunda kayıt yapılmaz. Supabase'i bağladığında bu işlem çalışacak.";

function clean(value: unknown, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

// ---------------------------------------------------------------- başvuru
export type EntryInput = {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  aiTools: string;
  description: string;
  audioPath: string;
  coverPath: string;
};

export async function submitEntry(input: EntryInput): Promise<ActionResult> {
  if (isPreview) return { ok: false, message: PREVIEW_MESSAGE };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Başvuru yapmak için giriş yapmalısın.", needLogin: true };

  const settings = await getSettings();
  if (settings.phase !== "submissions") return { ok: false, message: "Başvurular şu an kapalı." };

  const title = clean(input.title, LIMITS.title);
  const artistName = clean(input.artistName, LIMITS.artistName);
  const genre = clean(input.genre, LIMITS.genre) || null;
  const aiTools = clean(input.aiTools, LIMITS.aiTools);
  const description = String(input.description ?? "").trim().slice(0, LIMITS.description) || null;
  if (!title || !artistName) return { ok: false, message: "Şarkı adı ve sanatçı adı zorunlu." };
  if (!aiTools) return { ok: false, message: "Kullandığın yapay zekâ araçlarını yazmalısın." };
  if (
    !isValidStoragePath(input.audioPath, viewer.id, input.id, AUDIO_FORMATS) ||
    !isValidStoragePath(input.coverPath, viewer.id, input.id, COVER_FORMATS)
  ) {
    return { ok: false, message: "Dosyalar beklenmeyen bir konumda. Sayfayı yenileyip tekrar dene." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("entries").insert({
    id: input.id,
    user_id: viewer.id,
    title,
    artist_name: artistName,
    genre,
    ai_tools: aiTools,
    description,
    audio_path: input.audioPath,
    cover_path: input.coverPath,
  });
  if (error) {
    const limitHit = error.code === "42501";
    return {
      ok: false,
      message: limitHit
        ? `Başvuru kaydedilemedi. Kişi başı en fazla ${settings.maxEntriesPerUser} şarkı gönderilebilir.`
        : `Başvuru kaydedilemedi: ${error.message}`,
    };
  }
  refresh();
  return { ok: true };
}

export async function withdrawEntry(entryId: string): Promise<ActionResult> {
  if (isPreview) return { ok: false, message: PREVIEW_MESSAGE };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Giriş yapmalısın.", needLogin: true };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", viewer.id)
    .select("audio_path,cover_path");
  if (error || !data?.length) {
    return { ok: false, message: "Başvuru geri çekilemedi. Başvurular kapandıysa yöneticiye yaz." };
  }
  await Promise.all([
    supabase.storage.from("audio").remove([data[0].audio_path]),
    supabase.storage.from("covers").remove([data[0].cover_path]),
  ]);
  refresh();
  return { ok: true, message: "Başvurun geri çekildi." };
}

// ---------------------------------------------------------------- oy
export async function castVote(entryId: string): Promise<ActionResult> {
  if (isPreview) {
    (await cookies()).set(PREVIEW_VOTE_COOKIE, entryId, { path: "/", maxAge: 60 * 60 * 24 });
    refresh();
    return { ok: true, message: "Oyun kaydedildi (önizleme)." };
  }
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Oy vermek için Google ile giriş yap.", needLogin: true };
  const settings = await getSettings();
  if (settings.phase !== "voting") return { ok: false, message: "Oylama şu an açık değil." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("votes")
    .upsert({ user_id: viewer.id, entry_id: entryId, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { ok: false, message: "Oyun kaydedilemedi. Sayfayı yenileyip tekrar dene." };
  refresh();
  return { ok: true, message: "Oyun kaydedildi." };
}

// ---------------------------------------------------------------- jüri puanı
export async function saveJuryScores(
  entryId: string,
  scores: Record<string, number>,
  note: string,
): Promise<ActionResult> {
  const [viewer, settings, criteria] = await Promise.all([getViewer(), getSettings(), getCriteria()]);
  if (!isStaff(viewer)) return { ok: false, message: "Puan vermek için jüri üyesi olmalısın." };
  if (settings.phase !== "review") {
    return { ok: false, message: "Puanlama yalnızca jüri değerlendirmesi aşamasında yapılabilir." };
  }
  const clean: Record<string, number> = {};
  for (const c of criteria) {
    const v = scores[c.id];
    if (v === undefined) continue;
    if (!Number.isInteger(v) || v < 1 || v > 10) return { ok: false, message: "Puanlar 1 ile 10 arasında olmalı." };
    clean[c.id] = v;
  }
  if (Object.keys(clean).length < criteria.length) {
    return { ok: false, message: "Kaydetmeden önce her kritere bir puan ver." };
  }
  const trimmedNote = String(note ?? "").trim().slice(0, 1000);

  if (isPreview) {
    const saved = await previewScores();
    saved[entryId] = { s: clean, n: trimmedNote.slice(0, 160) }; // çerez boyutu sınırlı
    (await cookies()).set(PREVIEW_SCORES_COOKIE, JSON.stringify(saved), { path: "/", maxAge: 60 * 60 * 24 });
    refresh();
    return { ok: true, message: "Kaydedildi (önizleme)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("jury_save", { p_entry: entryId, p_scores: clean, p_note: trimmedNote });
  if (error) return { ok: false, message: error.message || "Puanlar kaydedilemedi." };
  refresh();
  return { ok: true, message: "Kaydedildi." };
}

// ---------------------------------------------------------------- önizleme
export async function setPreviewPhase(phase: Phase): Promise<void> {
  if (!isPreview || !PHASES.includes(phase)) return;
  (await cookies()).set(PREVIEW_PHASE_COOKIE, phase, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  refresh();
}
