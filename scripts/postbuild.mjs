// Makes .next/standalone self-contained so hosts can run `node .next/standalone/server.js` as-is.
// `next build` leaves static assets and /public out of the standalone folder; copy them in.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const standalone = path.join(root, ".next", "standalone");
if (!fs.existsSync(standalone)) {
  console.log("postbuild: no .next/standalone found, skipping");
  process.exit(0);
}
fs.cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
if (fs.existsSync(path.join(root, "public"))) fs.cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
console.log("postbuild: standalone server ready (static + public copied)");
