import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-16">
      <p className="display text-[clamp(5rem,20vw,10rem)] text-ink/15">404</p>
      <h1 className="display -mt-6 text-5xl">Bu sayfa bulunamadı</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Bağlantı yanlış olabilir ya da şarkı henüz herkese açılmamış olabilir.
      </p>
      <Link href="/" className="btn btn-primary mt-8">
        Ana sayfaya dön
      </Link>
    </div>
  );
}
