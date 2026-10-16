export const PHASES = ["upcoming", "submissions", "review", "voting", "results"] as const;
export type Phase = (typeof PHASES)[number];

export type Role = "user" | "jury" | "admin";
export type EntryStatus = "submitted" | "finalist" | "disqualified";

export type Settings = {
  title: string;
  tagline: string;
  description: string;
  rules: string;
  phase: Phase;
  submissionDeadline: string | null;
  votingEndsAt: string | null;
  maxEntriesPerUser: number;
  /** Jüri puanlarken sanatçı adı ve gönderen gizlenir */
  blindJudging: boolean;
  /** Supabase kurulumu eksikse kullanıcıya gösterilecek açıklama */
  setupError?: string;
};

export type Criterion = {
  id: string;
  name: string;
  description: string | null;
  weight: number;
};

/** Jürinin puanlama ekranındaki bir şarkı */
export type JuryCard = {
  entry: Entry;
  code: string; // "Eser 07": kör değerlendirmede şarkının adı yerine geçen etiket
  myScores: Record<string, number>; // kriter id → 1..10
  myNote: string;
};

export type JudgeProgress = {
  email: string | null;
  name: string | null;
  completed: number;
};

export type Viewer = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: Role;
};

export type Entry = {
  id: string;
  userId: string;
  title: string;
  artistName: string;
  genre: string | null;
  /** Şarkıyı üretirken kullanılan yapay zekâ araçları (ör. "Suno, kapak Midjourney") */
  aiTools: string | null;
  description: string | null;
  coverUrl: string;
  audioUrl: string | null;
  audioPath: string;
  coverPath: string;
  status: EntryStatus;
  createdAt: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  votes?: number;
  /** Yalnızca yöneticiye: ağırlıklı jüri ortalaması (1–10), puan veren jüri sayısı, kriter ortalamaları */
  juryScore?: number | null;
  judges?: number;
  criteriaScores?: Record<string, number>;
};

/** Bir jürinin bir şarkıya verdiği puanların kriter ağırlıklı ortalaması */
export function weightedAverage(scores: Record<string, number>, criteria: Criterion[]): number | null {
  let sum = 0;
  let weights = 0;
  for (const c of criteria) {
    const s = scores[c.id];
    if (typeof s === "number") {
      sum += s * c.weight;
      weights += c.weight;
    }
  }
  return weights ? sum / weights : null;
}

export function formatScore(n: number | null | undefined): string {
  return n == null ? "–" : n.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

export type TeamMember = {
  email: string;
  name: string | null;
  role: Exclude<Role, "user">;
  joined: boolean; // siteye giriş yapmış mı
  owner?: boolean; // site sahibi: yöneticiliği sitede kaldırılamaz
};

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string; needLogin?: boolean };

export function isStaff(v: Viewer | null): boolean {
  return v?.role === "admin" || v?.role === "jury";
}
