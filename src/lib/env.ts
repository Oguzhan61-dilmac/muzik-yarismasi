export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/** Supabase bağlı değilse site örnek verilerle "önizleme modunda" çalışır. */
export const isPreview = !SUPABASE_URL || !SUPABASE_KEY;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export function coverPublicUrl(path: string): string {
  if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("/")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/covers/${path}`;
}
