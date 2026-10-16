import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getViewer } from "@/lib/data";
import { isStaff, type Viewer } from "@/lib/types";
import { AdminNav } from "./admin-nav";

/** Yönetim sayfalarının ortak çerçevesi; yetkisiz kullanıcıyı durdurur. */
export async function AdminShell({
  next,
  adminOnly = false,
  children,
}: {
  next: string;
  adminOnly?: boolean;
  children: (viewer: Viewer) => ReactNode;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/giris?next=${encodeURIComponent(next)}`);
  if (!isStaff(viewer)) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-14">
        <h1 className="display text-5xl">Yönetim</h1>
        <p className="notice mt-6 text-lg">Bu sayfa yalnızca yarışma ekibi içindir.</p>
      </div>
    );
  }
  if (adminOnly && viewer.role !== "admin") redirect("/yonetim/puanla");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:pt-14">
      <h1 className="display text-[clamp(2.75rem,7vw,4.25rem)]">{viewer.role === "admin" ? "Yönetim" : "Jüri"}</h1>
      <div className="mt-6">
        <AdminNav isAdmin={viewer.role === "admin"} />
      </div>
      <div className="mt-8">{children(viewer)}</div>
    </div>
  );
}
