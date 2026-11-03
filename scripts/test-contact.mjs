// Tests for the contact form rules. Run: npm run test:contact (Node 22.6+ for .ts imports)
import assert from "node:assert/strict";
import { validateContact, isRateLimited, MIN_FILL_MS, RATE_MAX, RATE_WINDOW_MS } from "../src/lib/contact.ts";

let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok  ", name); };

const NOW = 1_800_000_000_000;
const good = { name: "Ana Pérez", email: "Ana@Example.com", subject: "shop", message: "Hola, me gustaría saber el estado de mi pedido.", consent: "on", website: "", ts: String(NOW - 10_000) };

t("valid message passes and is normalised", () => {
  const r = validateContact(good, NOW);
  assert.ok(r.ok); assert.equal(r.data.email, "ana@example.com"); assert.equal(r.data.subject, "shop");
});
t("honeypot filled -> spam", () => assert.equal(validateContact({ ...good, website: "http://spam" }, NOW).error, "spam"));
t("too fast (bot) -> spam", () => assert.equal(validateContact({ ...good, ts: String(NOW - (MIN_FILL_MS - 100)) }, NOW).error, "spam"));
t("missing/garbled/stale timestamp -> spam", () => {
  assert.equal(validateContact({ ...good, ts: undefined }, NOW).error, "spam");
  assert.equal(validateContact({ ...good, ts: "abc" }, NOW).error, "spam");
  assert.equal(validateContact({ ...good, ts: String(NOW - 7 * 3600e3) }, NOW).error, "spam");
});
t("name rules", () => {
  assert.equal(validateContact({ ...good, name: " a " }, NOW).error, "name");
  assert.equal(validateContact({ ...good, name: "" }, NOW).error, "name");
});
t("email rules (invalid, header injection attempts)", () => {
  for (const email of ["", "x", "a@b", "a b@c.com", "a@b.c", "a@b.com,evil@x.com", "a@b.com\nBcc: x@y.com", "<a@b.com>"]) {
    assert.equal(validateContact({ ...good, email }, NOW).error, "email", JSON.stringify(email));
  }
});
t("message length 10..3000 (long text is cut, not accepted raw)", () => {
  assert.equal(validateContact({ ...good, message: "corto" }, NOW).error, "message");
  const r = validateContact({ ...good, message: "x".repeat(5000) }, NOW);
  assert.ok(r.ok); assert.equal(r.data.message.length, 3000);
});
t("consent is required", () => {
  assert.equal(validateContact({ ...good, consent: undefined }, NOW).error, "consent");
  assert.equal(validateContact({ ...good, consent: "yes" }, NOW).error, "consent");
});
t("unknown subject falls back to general; control characters are stripped", () => {
  const r = validateContact({ ...good, subject: "<script>", name: "Ana\u0000\u0007", message: "Mensaje largo con\u0001 control" }, NOW);
  assert.ok(r.ok); assert.equal(r.data.subject, "general"); assert.equal(r.data.name, "Ana"); assert.ok(!/[\u0000-\u0008]/.test(r.data.message));
});
t("name is one line (newlines collapsed)", () => {
  const r = validateContact({ ...good, name: "Ana\nBcc: x" }, NOW);
  assert.ok(r.ok); assert.ok(!r.data.name.includes("\n"));
});
t("rate limit: allows up to the max per hour, then blocks, then recovers", () => {
  const recent = Array.from({ length: RATE_MAX - 1 }, (_, i) => NOW - i * 1000);
  assert.equal(isRateLimited(recent, NOW), false);
  assert.equal(isRateLimited([...recent, NOW - 5000], NOW), true);
  assert.equal(isRateLimited([NOW - RATE_WINDOW_MS - 1, NOW - RATE_WINDOW_MS - 2, NOW - RATE_WINDOW_MS - 3], NOW), false);
});

console.log(`\n${pass} tests passed`);
