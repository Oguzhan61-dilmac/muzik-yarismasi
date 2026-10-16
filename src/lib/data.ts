import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { coverPublicUrl, isPreview } from "./env";
import {
  DEMO_CRITERIA, DEMO_ENTRIES, DEMO_PROGRESS, DEMO_TEAM, DEMO_VIEWER, PREVIEW_PHASE_COOKIE,
  PREVIEW_SCORES_COOKIE, PREVIEW_VOTE_COOKIE, demoSettings, withDemoJury,
} from "./demo";
import {
  PHASES, isStaff, type Criterion, type Entry, type EntryStatus, type JudgeProgress, type JuryCard, type Phase,
  type Settings, type TeamMember, type Viewer,
} from "./types";

const AUDIO_URL_TTL = 60 * 60 * 3; // 3 saat
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------- önizleme yardımcıları
async function previewPhase(): Promise<Phase> {
  const v = (await cookies()).get(PREVIEW_PHASE_COOKIE)?.value as Phase | undefined;
  return v && PHASES.includes(v) ? v : "submissions";
}
async function previewVote(): Promise<string | null> {
  return (await cookies()).get(PREVIEW_VOTE_COOKIE)?.value ?? null;
}
function demoVisible(phase: Phase) {
  return DEMO_ENTRIES.filter((e) => e.status === "finalist" && (phase === "voting" || phase === "results"));
}

export type PreviewScores = Record<string, { s: Record<string, number>; n: string }>;

export async function previewScores(): Promise<PreviewScores> {
  try {
    const raw = (await cookies()).get(PREVIEW_SCORES_COOKIE)?.value;
    return raw ? (JSON.parse(raw) as PreviewScores) : {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------- satır dönüştürme
type EntryRow = {
  id: string; user_id: string; title: string; artist_name: string; genre: string | null;
  ai_tools: string | null; description: string | null; audio_path: string; cover_path: string; status: EntryStatus;
  created_at: string; profiles?: { full_name: string | null; email: string | null } | null;
};
const ENTRY_COLUMNS = "id,user_id,title,artist_name,genre,ai_tools,description,audio_path,cover_path,status,created_at";

function mapEntry(r: EntryRow, audioUrl: string | null): Entry {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    artistName: r.artist_name,
    genre: r.genre,
    aiTools: r.ai_tools,
    description: r.description,
    coverUrl: coverPublicUrl(r.cover_path),
    audioUrl,
    audioPath: r.audio_path,
    coverPath: r.cover_path,
    status: r.status,
    createdAt: r.created_at,
    ownerName: r.profiles?.full_name ?? null,
    ownerEmail: r.profiles?.email ?? null,
  };
}

/** Ses dosyaları gizli kovada; okuma izni olanlar için süreli bağlantı üretir. */
async function withAudio(supabase: SupabaseClient, rows: EntryRow[]): Promise<Entry[]> {
  const urls = new Map<string, string>();
  const paths = rows.map((r) => r.audio_path);
  if (paths.length) {
    const { data } = await supabase.storage.from("audio").createSignedUrls(paths, AUDIO_URL_TTL);
    data?.forEach((d) => d.path && d.signedUrl && urls.set(d.path, d.signedUrl));
  }
  return rows.map((r) => mapEntry(r, urls.get(r.audio_path) ?? null));
}

// ---------------------------------------------------------------- herkese açık veriler
export const getSettings = cache(async (): Promise<Settings> => {
  if (isPreview) return demoSettings(await previewPhase());
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    // Site çökmesin; aşamayı "yakında"ya çekip kurulum uyarısı göster.
    return {
      ...demoSettings("upcoming"),
      title: "AI Müzik Yarışması",
      setupError:
        "Veritabanına ulaşılamadı. Supabase'de supabase/schema.sql dosyasını çalıştırdığından ve " +
        "ortam değişkenlerinin doğru olduğundan emin ol." + (error?.message ? ` (${error.message})` : ""),
    };
  }
  return {
    title: data.title,
    tagline: data.tagline,
    description: data.description,
    rules: data.rules,
    phase: data.phase,
    submissionDeadline: data.submission_deadline,
    votingEndsAt: data.voting_ends_at,
    maxEntriesPerUser: data.max_entries_per_user,
    blindJudging: data.blind_judging ?? true,
  };
});

export const getCriteria = cache(async (): Promise<Criterion[]> => {
  if (isPreview) return DEMO_CRITERIA;
  const supabase = await createClient();
  const { data } = await supabase
    .from("criteria")
    .select("id,name,description,weight")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  return (data ?? []).map((c) => ({
    id: String(c.id),
    name: c.name,
    description: c.description,
    weight: Number(c.weight),
  }));
});

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (isPreview) return DEMO_VIEWER;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select("id,email,full_name,avatar_url,role")
    .eq("id", claims.sub)
    .maybeSingle();
  return {
    id: claims.sub,
    email: p?.email ?? (typeof claims.email === "string" ? claims.email : null),
    fullName: p?.full_name ?? null,
    avatarUrl: p?.avatar_url ?? null,
    role: p?.role ?? "user",
  };
});

/** Oylama ve sonuç aşamasında finalistler (jüri/yönetici her zaman görür). */
export async function getFinalists(): Promise<Entry[]> {
  if (isPreview) return demoVisible(await previewPhase());
  const supabase = await createClient();
  const { data } = await supabase
    .from("entries")
    .select(ENTRY_COLUMNS)
    .eq("status", "finalist")
    .order("created_at", { ascending: true });
  return withAudio(supabase, (data ?? []) as EntryRow[]);
}

export async function getMyVote(): Promise<string | null> {
  if (isPreview) return previewVote();
  const viewer = await getViewer();
  if (!viewer) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("votes").select("entry_id").eq("user_id", viewer.id).maybeSingle();
  return data?.entry_id ?? null;
}

export async function getEntry(id: string): Promise<Entry | null> {
  if (isPreview) {
    // Önizleme kullanıcısı yönetici olduğu için (gerçekteki gibi) her başvuruyu görebilir.
    return DEMO_ENTRIES.find((x) => x.id === id) ?? null;
  }
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("entries").select(ENTRY_COLUMNS).eq("id", id).maybeSingle();
  if (!data) return null;
  return (await withAudio(supabase, [data as EntryRow]))[0];
}

/** Sonuçlar: sonuç aşamasında herkese, öncesinde yalnızca yöneticiye döner. */
export async function getResults(): Promise<Entry[]> {
  if (isPreview) {
    return demoVisible(await previewPhase()).slice().sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
  }
  const supabase = await createClient();
  const [finalists, { data: counts }] = await Promise.all([
    getFinalists(),
    supabase.rpc("vote_results"),
  ]);
  if (!counts?.length) return [];
  const votes = new Map<string, number>(
    (counts as { entry_id: string; votes: number }[]).map((c) => [c.entry_id, Number(c.votes)]),
  );
  return finalists
    .map((e) => ({ ...e, votes: votes.get(e.id) ?? 0 }))
    .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
}

// ---------------------------------------------------------------- katılımcıya özel
export async function getMyEntries(): Promise<Entry[]> {
  if (isPreview) return DEMO_ENTRIES.filter((e) => e.userId === DEMO_VIEWER.id);
  const viewer = await getViewer();
  if (!viewer) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("entries")
    .select(ENTRY_COLUMNS)
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false });
  return withAudio(supabase, (data ?? []) as EntryRow[]);
}

// ---------------------------------------------------------------- jüri / yönetici
/** Tüm başvurular. Yöneticiye oy sayıları ve jüri puanlarıyla birlikte döner. */
export async function getAllEntries(status?: EntryStatus): Promise<Entry[]> {
  if (isPreview) {
    return withDemoJury(DEMO_ENTRIES.filter((e) => !status || e.status === status));
  }
  const supabase = await createClient();
  let q = supabase
    .from("entries")
    .select(`${ENTRY_COLUMNS},profiles(full_name,email)`)
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const viewer = await getViewer();
  const [{ data }, { data: counts }, { data: jury }] = await Promise.all([
    q,
    supabase.rpc("vote_results"),
    viewer?.role === "admin" ? supabase.rpc("jury_results") : Promise.resolve({ data: null }),
  ]);
  const votes = new Map<string, number>(
    ((counts ?? []) as { entry_id: string; votes: number }[]).map((c) => [c.entry_id, Number(c.votes)]),
  );
  type JuryRow = { entry_id: string; judges: number; score: number | string; criteria: Record<string, number | string> };
  const juryById = new Map<string, JuryRow>(((jury ?? []) as JuryRow[]).map((j) => [j.entry_id, j]));
  const entries = await withAudio(supabase, (data ?? []) as unknown as EntryRow[]);
  return entries.map((e) => {
    const j = juryById.get(e.id);
    return {
      ...e,
      ...(votes.has(e.id) ? { votes: votes.get(e.id) } : {}),
      ...(viewer?.role === "admin"
        ? {
            juryScore: j ? Number(j.score) : null,
            judges: j?.judges ?? 0,
            criteriaScores: j
              ? Object.fromEntries(Object.entries(j.criteria).map(([k, v]) => [k, Number(v)]))
              : {},
          }
        : {}),
    };
  });
}

/** Jürinin puanlama listesi: yarışma dışı bırakılanlar hariç, gönderim sırasıyla. */
export async function getJuryQueue(): Promise<JuryCard[]> {
  const toCards = (entries: Entry[], scores: Map<string, Record<string, number>>, notes: Map<string, string>) =>
    entries
      .filter((e) => e.status !== "disqualified")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .map((entry, i) => ({
        entry,
        code: `Eser ${String(i + 1).padStart(2, "0")}`,
        myScores: scores.get(entry.id) ?? {},
        myNote: notes.get(entry.id) ?? "",
      }));

  if (isPreview) {
    const saved = await previewScores();
    return toCards(
      DEMO_ENTRIES,
      new Map(Object.entries(saved).map(([id, v]) => [id, v.s])),
      new Map(Object.entries(saved).map(([id, v]) => [id, v.n])),
    );
  }
  const viewer = await getViewer();
  if (!isStaff(viewer)) return [];
  const supabase = await createClient();
  const [{ data: rows }, { data: scoreRows }, { data: noteRows }] = await Promise.all([
    supabase.from("entries").select(ENTRY_COLUMNS).neq("status", "disqualified"),
    supabase.from("scores").select("entry_id,criterion_id,score").eq("judge_id", viewer!.id),
    supabase.from("judge_notes").select("entry_id,note").eq("judge_id", viewer!.id),
  ]);
  const scores = new Map<string, Record<string, number>>();
  for (const s of scoreRows ?? []) {
    const m = scores.get(s.entry_id) ?? {};
    m[String(s.criterion_id)] = s.score;
    scores.set(s.entry_id, m);
  }
  const notes = new Map<string, string>((noteRows ?? []).map((n) => [n.entry_id, n.note]));
  const entries = await withAudio(supabase, (rows ?? []) as EntryRow[]);
  return toCards(entries, scores, notes);
}

/** Yönetici için: her jüri üyesinin tamamen puanladığı şarkı sayısı. */
export async function getJuryProgress(): Promise<JudgeProgress[]> {
  if (isPreview) return DEMO_PROGRESS;
  const supabase = await createClient();
  const { data } = await supabase.rpc("jury_progress");
  return ((data ?? []) as { email: string | null; full_name: string | null; completed: number }[]).map((r) => ({
    email: r.email,
    name: r.full_name,
    completed: Number(r.completed),
  }));
}

export async function getStats(): Promise<{ entries: number; finalists: number; disqualified: number; votes: number }> {
  if (isPreview) {
    return {
      entries: DEMO_ENTRIES.length,
      finalists: DEMO_ENTRIES.filter((e) => e.status === "finalist").length,
      disqualified: DEMO_ENTRIES.filter((e) => e.status === "disqualified").length,
      votes: DEMO_ENTRIES.reduce((s, e) => s + (e.votes ?? 0), 0),
    };
  }
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [a, b, c, d] = await Promise.all([
    supabase.from("entries").select("id", head),
    supabase.from("entries").select("id", head).eq("status", "finalist"),
    supabase.from("votes").select("user_id", head),
    supabase.from("entries").select("id", head).eq("status", "disqualified"),
  ]);
  return { entries: a.count ?? 0, finalists: b.count ?? 0, disqualified: d.count ?? 0, votes: c.count ?? 0 };
}

export async function getTeam(): Promise<TeamMember[]> {
  if (isPreview) return DEMO_TEAM;
  const supabase = await createClient();
  const [{ data: profiles }, { data: invites }, { data: owners }] = await Promise.all([
    supabase.from("profiles").select("email,full_name,role").in("role", ["jury", "admin"]),
    supabase.from("role_invites").select("email,role"),
    supabase.rpc("owner_emails"),
  ]);
  const ownerSet = new Set(((owners ?? []) as string[]).map((e) => e.toLowerCase()));
  const members = new Map<string, TeamMember>();
  for (const i of invites ?? []) {
    members.set(i.email.toLowerCase(), { email: i.email, name: null, role: i.role, joined: false });
  }
  for (const p of profiles ?? []) {
    if (!p.email) continue;
    members.set(p.email.toLowerCase(), { email: p.email, name: p.full_name, role: p.role, joined: true });
  }
  for (const [email, m] of members) if (ownerSet.has(email)) m.owner = true;
  return [...members.values()].sort((a, b) => (a.role === b.role ? a.email.localeCompare(b.email) : a.role === "admin" ? -1 : 1));
}
