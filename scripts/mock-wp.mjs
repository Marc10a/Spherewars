// Fake WordPress implementing the SphereWars contract (/wp-json/sphere/v1/*) from wordpress/fixtures. For local testing only.
// Usage: node scripts/mock-wp.mjs   (PORT=4020, MOCK_WP_TOKEN=secret-preview-token)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "wordpress", "fixtures");
const load = (n) => JSON.parse(fs.readFileSync(path.join(root, `${n}.json`), "utf8"));
const PORT = Number(process.env.PORT ?? 4020);
const TOKEN = process.env.MOCK_WP_TOKEN ?? "secret-preview-token";

const draft = {
  id: 999, slug: "borrador-secreto", title: "BORRADOR (solo con token)", category: "Borrador", published_at: null,
  excerpt: "", content_html: "<p>Este texto solo debe verse en la vista previa.</p>", image: null,
};

http.createServer((req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  const hit = (req.headers.authorization ?? "") === `Bearer ${TOKEN}`;
  console.log(new Date().toISOString(), req.method, u.pathname + u.search, hit ? "[token]" : "");
  const m = u.pathname.match(/^\/wp-json\/sphere\/v1\/([a-z-]+)$/);
  if (!m) return send(404, { error: "not found" });
  const q = u.searchParams;
  const limit = q.get("limit") ? Number(q.get("limit")) : undefined;

  if (m[1] === "news") {
    let items = load("news").items;
    if (q.get("slug")) {
      if (q.get("preview") === "1") { if (!hit) return send(401, { error: "preview needs the token" }); if (q.get("slug") === draft.slug) return send(200, { items: [draft] }); }
      items = items.filter((i) => i.slug === q.get("slug"));
    }
    return send(200, { items: limit ? items.slice(0, limit) : items });
  }
  if (m[1] === "events") {
    let items = load("events").items;
    const now = Date.now();
    if (q.get("when") === "upcoming") items = items.filter((e) => Date.parse(e.starts_at) >= now);
    if (q.get("when") === "past") items = items.filter((e) => Date.parse(e.starts_at) < now);
    if (q.get("slug")) items = items.filter((e) => e.slug === q.get("slug"));
    return send(200, { items: limit ? items.slice(0, limit) : items });
  }
  if (m[1] === "featured-minis") return send(200, load("featured-minis"));
  return send(404, { error: "unknown" });
}).listen(PORT, () => console.log(`mock WordPress on http://localhost:${PORT}`));
