import { NextResponse } from "next/server";
import { getAllEntries, getCriteria, getViewer } from "@/lib/data";
import { STATUS_LABEL } from "@/lib/format";

function cell(value: unknown): string {
  const s = String(value ?? "").replace(/\r?\n/g, " ");
  return /[";]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Başvuruları Excel'de açılabilen CSV olarak indirir (yalnızca yönetici). */
export async function GET() {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return new NextResponse("Yetkisiz", { status: 403 });

  const [entries, criteria] = await Promise.all([getAllEntries(), getCriteria()]);
  const num = (n: number | null | undefined) => (n == null ? "" : n.toLocaleString("tr-TR", { maximumFractionDigits: 2 }));
  const header = [
    "Şarkı", "Sanatçı", "Tür", "Yapay zekâ araçları", "Gönderen", "E-posta", "Durum",
    "Jüri puanı", "Puan veren jüri", ...criteria.map((c) => `Jüri: ${c.name}`),
    "Oy", "Gönderim tarihi", "Nasıl üretildi", "Sayfa",
  ];
  const rows = entries.map((e) => [
    e.title,
    e.artistName,
    e.genre,
    e.aiTools,
    e.ownerName,
    e.ownerEmail,
    STATUS_LABEL[e.status],
    num(e.juryScore),
    e.judges ?? 0,
    ...criteria.map((c) => num(e.criteriaScores?.[c.id])),
    e.votes ?? "",
    new Date(e.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }),
    e.description,
    `/sarki/${e.id}`,
  ]);
  // Türkçe Excel ";" ayırıcı ve BOM ile UTF-8'i doğru açar
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="basvurular-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
