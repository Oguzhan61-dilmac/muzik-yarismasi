"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = isAdmin
    ? [
        { href: "/yonetim", label: "Yarışma" },
        { href: "/yonetim/basvurular", label: "Başvurular" },
        { href: "/yonetim/puanla", label: "Puanla" },
        { href: "/yonetim/ekip", label: "Ekip" },
      ]
    : [{ href: "/yonetim/puanla", label: "Puanla" }];
  return (
    <nav aria-label="Yönetim" className="-mx-4 flex gap-1 overflow-x-auto border-b-2 border-ink px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-0.5 shrink-0 whitespace-nowrap border-2 px-3 py-2 font-semibold no-underline sm:px-4 ${
              active ? "border-ink border-b-paper bg-paper" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
