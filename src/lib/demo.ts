// Önizleme modu: Supabase bağlanmadan siteyi örnek verilerle gezmek için.
// Gerçek kurulumda (ortam değişkenleri tanımlıyken) bu dosya kullanılmaz.

import type { Criterion, Entry, JudgeProgress, Phase, Settings, TeamMember, Viewer } from "./types";

export const PREVIEW_PHASE_COOKIE = "onizleme_asama";
export const PREVIEW_VOTE_COOKIE = "onizleme_oy";
export const PREVIEW_SCORES_COOKIE = "onizleme_puanlar";

export const DEMO_VIEWER: Viewer = {
  id: "onizleme-kullanici",
  email: "sen@ornek.com",
  fullName: "Önizleme Kullanıcısı",
  avatarUrl: null,
  role: "admin",
};

export function demoSettings(phase: Phase): Settings {
  return {
    title: "AI Müzik Yarışması",
    tagline: "Yapay zekâyla şarkını üret, finale kal, oyları topla.",
    description:
      "Yapay zekâ araçlarıyla (Suno, Udio ve benzerleri) ürettiğin bir şarkıyı kapak görseliyle birlikte gönder. " +
      "Fikir, söz ve seçimler senden; yapay zekâ senin enstrümanın. " +
      "Jüri tüm başvuruları dinleyip puanlar ve finalistleri seçer; kazananı finalistler arasından herkesin oyu belirler.",
    rules:
      "Şarkı yapay zekâ araçlarıyla üretilmiş olmalı (Suno, Udio ve benzerleri). Başvururken hangi araçları kullandığını yazman gerekir.\n" +
      "Şarkıyı sen üretmiş olmalısın; başkasının ürettiği ya da internette bulduğun bir şarkıyı gönderemezsin.\n" +
      "Kullandığın araçların koşulları şarkıyı bu yarışmada paylaşmana izin vermeli.\n" +
      "Gerçek bir sanatçının sesini taklit eden ya da var olan bir şarkıyı kopyalayan başvurular yarışma dışı bırakılır.\n" +
      "Her katılımcı en fazla 1 şarkıyla katılabilir.\n" +
      "Şarkı MP3 ya da M4A biçiminde, en fazla 10 MB olmalı. Kapak görseli kare olmalı; kapağı da yapay zekâyla üretebilirsin.\n" +
      "Nefret söylemi, hakaret ve müstehcenlik içeren başvurular yarışma dışı bırakılır.\n" +
      "Jüri şarkıları isimleri görmeden puanlar; finalistleri jüri puanlarına göre yarışma ekibi belirler.\n" +
      "Kazananı finalistler arasından halk oylaması belirler. Her Google hesabı bir oy kullanabilir; oylama bitene kadar oyunu değiştirebilirsin.",
    phase,
    // Sabit örnek tarihler (önizlemede render sırasında saat okunmasın)
    submissionDeadline: "2026-11-15T20:59:00.000Z",
    votingEndsAt: "2026-12-06T20:59:00.000Z",
    maxEntriesPerUser: 1,
    blindJudging: true,
  };
}

export const DEMO_CRITERIA: Criterion[] = [
  { id: "1", name: "Fikir ve söz", description: "Şarkının fikri, teması ve sözleri; ne kadar özgün ve akılda kalıcı olduğu.", weight: 1 },
  { id: "2", name: "Müzikalite", description: "Melodi, armoni ve şarkı yapısı; parçanın baştan sona tutarlı ilerlemesi.", weight: 1 },
  { id: "3", name: "Ses kalitesi", description: "Miks ve genel ses; bozulma, cızırtı, kopukluk gibi yapay zekâ izlerinin azlığı.", weight: 1 },
  { id: "4", name: "Yaratıcı AI kullanımı", description: "Araçların ne kadar emek ve yaratıcılıkla kullanıldığı: prompt, deneme, düzenleme, ek prodüksiyon.", weight: 1 },
  { id: "5", name: "Kapak görseli", description: "Kapağın şarkıyla uyumu ve görsel etkisi.", weight: 0.5 },
];

// --- Örnek kapaklar: iki renkli risograf baskı görünümünde SVG -------------------
const INKS = [
  ["#ff48b0", "#0078bf"],
  ["#ffe800", "#ff48b0"],
  ["#00a95c", "#0078bf"],
  ["#ff6c2f", "#3255a4"],
  ["#0078bf", "#ff48b0"],
  ["#ff48b0", "#00a95c"],
  ["#ffe800", "#0078bf"],
  ["#3255a4", "#ff6c2f"],
];

function cover(i: number, shape: "circles" | "stripes" | "sun" | "grid"): string {
  const [a, b] = INKS[i % INKS.length];
  const shapes = {
    circles: `<circle cx="120" cy="140" r="90" fill="${a}"/><circle cx="190" cy="170" r="90" fill="${b}"/>`,
    stripes: Array.from({ length: 7 }, (_, k) =>
      `<rect x="${k * 46 - 10}" y="-20" width="22" height="360" fill="${k % 2 ? a : b}" transform="rotate(18 150 150)"/>`).join(""),
    sun: `<circle cx="150" cy="190" r="110" fill="${a}"/>${Array.from({ length: 6 }, (_, k) =>
      `<rect x="0" y="${190 + k * 18}" width="300" height="9" fill="${b}"/>`).join("")}`,
    grid: Array.from({ length: 16 }, (_, k) =>
      `<rect x="${(k % 4) * 75 + 8}" y="${Math.floor(k / 4) * 75 + 8}" width="59" height="59" rx="${k % 3 ? 0 : 30}" fill="${k % 2 ? a : b}"/>`).join(""),
  }[shape];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">` +
    `<rect width="300" height="300" fill="#f4f4f0"/>` +
    `<g style="mix-blend-mode:multiply">${shapes}</g>` +
    `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>` +
    `<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 0"/></filter>` +
    `<rect width="300" height="300" filter="url(#g)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type DemoSeed = [title: string, artist: string, genre: string, status: Entry["status"], shape: Parameters<typeof cover>[1], votes: number, aiTools: string, desc: string];

const SEEDS: DemoSeed[] = [
  ["Gece Vardiyası", "Kuzey Rüzgârı", "Rock", "finalist", "stripes", 412, "Suno, kapak Midjourney",
    "Sözleri gece vardiyasından dönerken yazdım; Suno'da kırk denemeden sonra bu sürüm çıktı."],
  ["Sahil Yolu", "Deniz & Arda", "Akustik", "submitted", "sun", 0, "Udio, gitarlar canlı kayıt",
    "İki gitar, bir yaz akşamı. Gitarları kendimiz çaldık, vokali Udio üretti."],
  ["Beton Çiçek", "MC Tuna", "Rap / Hip-hop", "finalist", "grid", 538, "Suno, sözler bana ait, miks FL Studio",
    "Büyüdüğüm mahalleye bir mektup. Sözler benim, beat yapay zekâdan."],
  ["Kırmızı Işık", "Selin Ay", "Pop", "finalist", "circles", 297, "Udio, kapak DALL·E",
    "Trafikte beklerken aklıma gelen nakaratı yapay zekâyla şarkıya çevirdim."],
  ["Sinyal Kaybı", "Modem 56k", "Elektronik", "finalist", "grid", 185, "Stable Audio, düzenleme Ableton",
    "Eski bir modemin bağlanma sesini örnek olarak verip üstüne parça kurdum."],
  ["Dört Mevsim Avlu", "Avlu Trio", "Caz", "disqualified", "circles", 0, "Suno",
    "Kontrbas, piyano, davul; hepsi tek bir prompttan."],
  ["Yayla Yolu", "Ezgi Karaca", "Türk halk müziği", "finalist", "sun", 351, "Suno (mırıldandığım kayıttan), kapak Midjourney",
    "Babaannemin söylediği bir ezgiyi mırıldanıp yapay zekâya verdim."],
  ["Son Otobüs", "Plak Kulübü", "Pop", "submitted", "stripes", 0, "Udio, sözler ChatGPT ile birlikte",
    "Kampüsten kalkan son otobüsü kaçıranlara."],
];

export const DEMO_ENTRIES: Entry[] = SEEDS.map(([title, artistName, genre, status, shape, votes, aiTools, description], i) => ({
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  userId: i === 1 ? DEMO_VIEWER.id : `demo-user-${i}`,
  title,
  artistName,
  genre,
  aiTools,
  description,
  coverUrl: cover(i, shape),
  audioUrl: `demo:${i}`,
  audioPath: `demo/${i}.mp3`,
  coverPath: `demo/${i}.jpg`,
  status,
  createdAt: new Date(Date.UTC(2026, 9, 1 + i, 9 + i)).toISOString(),
  ownerName: i === 1 ? DEMO_VIEWER.fullName : artistName,
  ownerEmail: i === 1 ? DEMO_VIEWER.email : `katilimci${i + 1}@ornek.com`,
  votes,
}));

// Örnek jüri sonuçları: finalistler üst sıralarda olacak şekilde sabit puanlar
const DEMO_JURY: Record<number, [score: number, judges: number, perCriterion: number[]]> = {
  0: [8.4, 3, [8.7, 8.3, 8.7, 8.0, 8.3]],
  1: [6.1, 3, [6.0, 5.3, 6.7, 6.3, 6.0]],
  2: [8.9, 3, [9.3, 8.7, 9.0, 9.0, 7.7]],
  3: [7.8, 3, [7.3, 8.3, 8.0, 7.7, 7.7]],
  4: [7.5, 2, [9.0, 7.5, 6.5, 6.5, 8.5]],
  5: [5.2, 2, [5.0, 5.5, 6.0, 4.5, 5.0]],
  6: [8.1, 3, [8.0, 7.3, 9.0, 8.3, 7.7]],
  7: [6.6, 2, [7.0, 6.0, 6.5, 7.0, 6.5]],
};

export function withDemoJury(entries: Entry[]): Entry[] {
  return entries.map((e) => {
    const i = DEMO_ENTRIES.findIndex((d) => d.id === e.id);
    const j = DEMO_JURY[i];
    if (!j) return e;
    return {
      ...e,
      juryScore: j[0],
      judges: j[1],
      criteriaScores: Object.fromEntries(DEMO_CRITERIA.map((c, k) => [c.id, j[2][k]])),
    };
  });
}

export const DEMO_PROGRESS: JudgeProgress[] = [
  { email: "sen@ornek.com", name: "Önizleme Kullanıcısı", completed: 0 },
  { email: "juri.uyesi@ornek.com", name: "Jüri Üyesi", completed: 7 },
  { email: "ikinci.juri@ornek.com", name: "İkinci Jüri", completed: 4 },
];

export const DEMO_TEAM: TeamMember[] = [
  { email: "sen@ornek.com", name: "Önizleme Kullanıcısı", role: "admin", joined: true, owner: true },
  { email: "juri.uyesi@ornek.com", name: "Jüri Üyesi", role: "jury", joined: true },
  { email: "davetli.juri@ornek.com", name: null, role: "jury", joined: false },
];
