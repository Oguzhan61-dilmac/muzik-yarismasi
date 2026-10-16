"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-16">
      <h1 className="display text-5xl">Bir şeyler ters gitti</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Sayfa yüklenemedi. Biraz sonra tekrar dene; sorun sürerse yarışma ekibine haber ver.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-8">
        Tekrar dene
      </button>
    </div>
  );
}
