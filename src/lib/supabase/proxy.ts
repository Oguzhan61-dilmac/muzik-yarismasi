import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPreview, SUPABASE_KEY, SUPABASE_URL } from "../env";

/** Her istekte oturumu tazeler ve güncel çerezleri yanıta yazar. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (isPreview) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Oturumu doğrular, süresi dolmuşsa yeniler. Bu çağrıyla setAll arasına kod eklemeyin.
  await supabase.auth.getClaims();
  return response;
}
