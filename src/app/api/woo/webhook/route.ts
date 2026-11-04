import { revalidatePath, revalidateTag } from "next/cache";
import { locales } from "@/lib/i18n";
import { isWooPing, verifyWooSignature } from "@/lib/woo/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WooCommerce webhook (product created / updated / deleted, WooCommerce > Settings > Advanced > Webhooks).
 *   Delivery URL: https://<site>/api/woo/webhook     Secret: WC_WEBHOOK_SECRET
 * The body is signed (X-WC-Webhook-Signature, HMAC-SHA256). Valid calls refresh the shop pages of every language, so a price,
 * photo or stock change made in WordPress shows up on the site within seconds. WooCommerce's unsigned creation "ping" gets a 200 and changes nothing.
 */
export async function POST(req: Request) {
  const secret = process.env.WC_WEBHOOK_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });
  const raw = await req.text();
  const signature = req.headers.get("x-wc-webhook-signature");
  if (isWooPing(raw, signature)) return Response.json({ ok: true });
  if (!verifyWooSignature(raw, signature, secret)) return new Response("Unauthorized", { status: 401 });

  revalidateTag("woo", "max");
  for (const l of locales) revalidatePath(`/${l}/tienda`, "layout");
  return Response.json({ ok: true });
}
