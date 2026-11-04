import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, locales } from "@/lib/i18n";
import { checkGate } from "@/lib/site-gate";

const COOKIE = "sw_locale";

async function guardAdmin(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return res;

  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
  const { data: { user } } = await sb.auth.getUser(); // also refreshes the session cookie
  if (!user && req.nextUrl.pathname !== "/admin/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  return res;
}

// Temporary site password first. Then /admin: session refresh + auth gate. Everything else: locale redirect to /es (default) or the browser's language.
export async function proxy(req: NextRequest) {
  const gate = checkGate(req.headers.get("authorization"));
  if (gate === "ask" || gate === "locked") {
    const closed = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };
    if (gate === "locked") return new NextResponse("Web en preparación.", { status: 503, headers: { ...closed, "Content-Type": "text/plain; charset=utf-8" } });
    return new NextResponse("Acceso restringido.", { status: 401, headers: { ...closed, "Content-Type": "text/plain; charset=utf-8", "WWW-Authenticate": 'Basic realm="SphereWars", charset="UTF-8"' } });
  }
  const res = await route(req);
  if (gate === "allowed") { res.headers.set("X-Robots-Tag", "noindex, nofollow"); res.headers.set("Cache-Control", "private, no-store"); }
  return res;
}

async function route(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin")) return guardAdmin(req);

  const first = pathname.split("/")[1];
  if (isLocale(first)) {
    // Remember the visitor's explicit choice for next time.
    const res = NextResponse.next();
    if (req.cookies.get(COOKIE)?.value !== first) res.cookies.set(COOKIE, first, { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" });
    return res;
  }

  // Locale-less URL: saved choice > browser language > default.
  const saved = req.cookies.get(COOKIE)?.value;
  const accept = req.headers.get("accept-language") ?? "";
  const fromBrowser = accept.split(",").map((p) => p.trim().slice(0, 2).toLowerCase()).find((l) => locales.includes(l as never));
  const chosen = (saved && isLocale(saved) ? saved : fromBrowser) ?? defaultLocale;
  const url = req.nextUrl.clone();
  url.pathname = `/${chosen}${pathname === "/" ? "" : pathname}`;
  const res = NextResponse.redirect(url, 307); // temporary: depends on cookie/browser language, must not be cached as permanent
  res.headers.set("Vary", "Accept-Language, Cookie");
  return res;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
