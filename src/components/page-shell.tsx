import type { ReactNode } from "react";

/** Sayfa başlığı ve içerik kabı. */
export function PageShell({
  title,
  lead,
  children,
  narrow = false,
}: {
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className={`mx-auto px-4 pt-10 sm:pt-14 ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>
      <h1 className="display misprint text-[clamp(2.75rem,7vw,4.75rem)]">{title}</h1>
      {lead && <div className="mt-3 max-w-2xl text-lg text-ink-soft">{lead}</div>}
      <div className="mt-8 sm:mt-10">{children}</div>
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-14" aria-busy="true" aria-label="Yükleniyor">
      <div className="h-14 w-2/3 max-w-lg animate-pulse bg-ink/10" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="h-4 animate-pulse bg-ink/10" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="display mb-6 scroll-mt-6 text-[clamp(2.25rem,5vw,3.25rem)]">
      {children}
    </h2>
  );
}
