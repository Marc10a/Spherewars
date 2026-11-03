import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-less client for PUBLIC reads (published news/events). Because it does not touch cookies, pages that use it can
 * stay statically generated and refresh on a timer (ISR) instead of rendering on every request. RLS still applies (anon role).
 */
export function supabasePublic() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
