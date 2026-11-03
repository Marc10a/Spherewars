// Crawls every page of the exported theme served by a local WordPress and checks: status 200, no PHP notices, and that every local
// link / image / file answers. Usage: node scripts/audit-wp.mjs [port=8100]
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const PORT = Number(process.argv[2] ?? 8100);
const ROOT = path.resolve(import.meta.dirname, "..");
const get = (p, head) => new Promise((res) => {
  const r = http.request({ host: "localhost", port: PORT, path: p, method: head ? "HEAD" : "GET", agent: false, headers: { Connection: "close" } }, (x) => {
    const b = []; x.on("data", (d) => b.push(d)); x.on("end", () => res({ s: x.statusCode, b: Buffer.concat(b).toString() }));
  });
  r.on("error", () => res({ s: 0, b: "" })); r.setTimeout(30000, () => r.destroy()); r.end();
});
const routes = JSON.parse(fs.readFileSync(path.join(ROOT, "wordpress/theme/spherewars/routes.json"), "utf8")).routes;
const pages = Object.keys(routes).filter((k) => k.startsWith("/"));
const seen = new Map(), bad = [];
let n = 0, noticed = 0;
for (const p of pages) {
  const { s, b: html } = await get(p);
  n++;
  if (s !== 200) bad.push([p, p, s]);
  if (/<b>(Warning|Notice|Deprecated|Fatal error)<\/b>|Warning:|Fatal error:/.test(html)) noticed++;
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    let u = m[1].replace(/&amp;/g, "&");
    if (u.startsWith(`http://localhost:${PORT}`)) u = u.slice(`http://localhost:${PORT}`.length);
    // /descargas is uploaded to the site root separately from the theme (see the guide)
    if (u.startsWith("/") && !u.startsWith("//") && !/^\/(wp-admin|wp-login|checkout|descargas)/.test(u)) refs.add(u);
  }
  for (const u of refs) {
    if (!seen.has(u)) seen.set(u, (await get(u, true)).s);
    const s2 = seen.get(u);
    if (s2 === 0 || s2 >= 400) bad.push([p, u, s2]);
  }
}
console.log("pages", n, "unique refs", seen.size, "bad", bad.length, "pages with PHP notices", noticed);
const uniq = new Map(); for (const b of bad) uniq.set(b[1], b);
for (const b of [...uniq.values()].slice(0, 20)) console.log(b.join(" | "));
