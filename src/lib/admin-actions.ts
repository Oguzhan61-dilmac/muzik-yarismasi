"use server";

import { refresh } from "next/cache";
import { createClient } from "./supabase/server";
import { getStats, getViewer } from "./data";
import { isPreview } from "./env";
import { fromLocalInput } from "./format";
import { PHASES, type ActionResult, type EntryStatus, type Phase } from "./types";

const PREVIEW_MESSAGE = "Önizleme modunda değişiklikler kaydedilmez.";

async function requireAdmin(): Promise<ActionResult | null> {
  if (isPreview) return { ok: false, message: PREVIEW_MESSAGE };
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return { ok: false, message: "Bu işlem için yönetici olmalısın." };
  return null;
}

export async function setPhase(phase: Phase): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!PHASES.includes(phase)) return { ok: false, message: "Geçersiz aşama." };
  if (phase === "voting") {
    const { finalists } = await getStats();
    if (finalists === 0) return { ok: false, message: "Oylamayı açmadan önce en az bir finalist seç." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({ phase, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { ok: false, message: `Aşama değiştirilemedi: ${error.message}` };
  refresh();
  return { ok: true, message: "Aşama güncellendi." };
}

export async function saveSettings(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const text = (key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);
  const title = text("title", 80);
  if (!title) return { ok: false, message: "Yarışma adı boş olamaz." };
  const maxEntries = Math.min(Math.max(Number(form.get("max_entries_per_user")) || 1, 1), 10);

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      title,
      tagline: text("tagline", 140),
      description: text("description", 2000),
      rules: text("rules", 6000),
      submission_deadline: fromLocalInput(String(form.get("submission_deadline") ?? "")),
      voting_ends_at: fromLocalInput(String(form.get("voting_ends_at") ?? "")),
      max_entries_per_user: maxEntries,
      blind_judging: form.get("blind_judging") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { ok: false, message: `Kaydedilemedi: ${error.message}` };
  refresh();
  return { ok: true, message: "Yarışma bilgileri kaydedildi." };
}

// ---------------------------------------------------------------- değerlendirme kriterleri
function readCriterion(form: FormData): { name: string; description: string | null; weight: number } | string {
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  const description = String(form.get("description") ?? "").trim().slice(0, 300) || null;
  const weight = Number(String(form.get("weight") ?? "1").replace(",", "."));
  if (!name) return "Kriterin adı boş olamaz.";
  if (!Number.isFinite(weight) || weight <= 0 || weight > 10) return "Ağırlık 0 ile 10 arasında olmalı (ör. 1 ya da 0,5).";
  return { name, description, weight: Math.round(weight * 100) / 100 };
}

export async function saveCriterion(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = readCriterion(form);
  if (typeof parsed === "string") return { ok: false, message: parsed };
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("criteria").update(parsed).eq("id", id);
    if (error) return { ok: false, message: `Kaydedilemedi: ${error.message}` };
  } else {
    const { data: last } = await supabase
      .from("criteria").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("criteria").insert({ ...parsed, sort_order: (last?.sort_order ?? 0) + 1 });
    if (error) return { ok: false, message: `Eklenemedi: ${error.message}` };
  }
  refresh();
  return { ok: true, message: id ? "Kriter güncellendi." : "Kriter eklendi." };
}

export async function deleteCriterion(id: string): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const supabase = await createClient();
  const { error, count } = await supabase.from("criteria").delete({ count: "exact" }).eq("id", id);
  if (error || !count) return { ok: false, message: "Kriter silinemedi." };
  refresh();
  return { ok: true, message: "Kriter silindi." };
}

export async function setEntryStatus(entryId: string, status: EntryStatus): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!["submitted", "finalist", "disqualified"].includes(status)) return { ok: false, message: "Geçersiz durum." };
  const supabase = await createClient();
  const { error } = await supabase.from("entries").update({ status }).eq("id", entryId);
  if (error) return { ok: false, message: `Güncellenemedi: ${error.message}` };
  refresh();
  return { ok: true };
}

export async function deleteEntry(entryId: string): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .delete()
    .eq("id", entryId)
    .select("audio_path,cover_path");
  if (error || !data?.length) return { ok: false, message: "Başvuru silinemedi." };
  await Promise.all([
    supabase.storage.from("audio").remove([data[0].audio_path]),
    supabase.storage.from("covers").remove([data[0].cover_path]),
  ]);
  refresh();
  return { ok: true, message: "Başvuru silindi." };
}

export async function inviteMember(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Geçerli bir e-posta yaz." };
  if (role !== "jury" && role !== "admin") return { ok: false, message: "Rol seç." };

  const supabase = await createClient();
  const { error } = await supabase.from("role_invites").upsert({ email, role }, { onConflict: "email" });
  if (error) return { ok: false, message: `Eklenemedi: ${error.message}` };
  const { data: updated } = await supabase.from("profiles").update({ role }).eq("email", email).select("id");
  refresh();
  return {
    ok: true,
    message: updated?.length
      ? `${email} artık ${role === "admin" ? "yönetici" : "jüri üyesi"}.`
      : `${email} davet edildi; Google ile ilk girişinde ${role === "admin" ? "yönetici" : "jüri"} olacak.`,
  };
}

export async function removeMember(email: string): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const viewer = await getViewer();
  if (viewer?.email?.toLowerCase() === email.toLowerCase()) {
    return { ok: false, message: "Kendi yöneticiliğini kaldıramazsın." };
  }
  const target = email.trim().toLowerCase();
  const supabase = await createClient();
  await supabase.from("role_invites").delete().eq("email", target);
  await supabase.from("profiles").update({ role: "user" }).eq("email", target);
  refresh();
  return { ok: true };
}
