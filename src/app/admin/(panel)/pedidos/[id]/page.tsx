import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { canWrite, requireStaff } from "@/lib/auth";
import { Flash, inputCls } from "@/components/admin";
import { updateOrder } from "@/app/admin/actions";
import { orderStatusLabels } from "@/lib/shop/labels";

const money = (c: number, cur = "EUR") => new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(c / 100);

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const staff = await requireStaff();
  const sb = await supabaseServer();
  const [{ data: o }, { data: items }] = await Promise.all([
    sb.from("orders").select("*").eq("id", id).maybeSingle(),
    sb.from("order_items").select("id, name, sku, unit_price_cents, qty").eq("order_id", id),
  ]);
  if (!o) notFound();
  const a = (o.shipping_address ?? {}) as Record<string, string | null>;
  const address = [a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" "), a.state, a.country].filter(Boolean);
  const editable = canWrite(staff.role);

  return (
    <>
      <h1 className="font-display text-3xl text-gold">Pedido #{o.number}</h1>
      <p className="mt-1 text-sm text-stone">{orderStatusLabels[o.status]} · {new Date(o.created_at).toLocaleString("es-ES")}{o.paid_at ? ` · pagado ${new Date(o.paid_at).toLocaleString("es-ES")}` : ""}</p>
      <div className="mt-6"><Flash error={error} saved={saved} /></div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-label="Cliente y envío" className="border border-gold/20 bg-coal p-5 text-sm">
          <h2 className="font-display text-lg">Cliente y envío</h2>
          <dl className="mt-3 grid gap-2">
            <div><dt className="text-xs uppercase tracking-widest text-gold">Nombre</dt><dd>{o.customer_name ?? "—"}</dd></div>
            <div><dt className="text-xs uppercase tracking-widest text-gold">Correo</dt><dd>{o.email ?? "—"}</dd></div>
            <div><dt className="text-xs uppercase tracking-widest text-gold">Teléfono</dt><dd>{o.phone ?? "—"}</dd></div>
            <div><dt className="text-xs uppercase tracking-widest text-gold">Dirección de envío</dt><dd>{address.length ? address.map((l, i) => <span key={i} className="block">{l}</span>) : "—"}</dd></div>
          </dl>
        </section>

        <section aria-label="Artículos" className="border border-gold/20 bg-coal p-5 text-sm">
          <h2 className="font-display text-lg">Artículos</h2>
          <ul className="mt-3 divide-y divide-gold/10">
            {(items ?? []).map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-2"><span>{i.qty} × {i.name}{i.sku ? ` (${i.sku})` : ""}</span><span>{money(i.unit_price_cents * i.qty, o.currency)}</span></li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-gold/20 pt-3">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(o.subtotal_cents, o.currency)}</dd></div>
            <div className="flex justify-between"><dt>Envío</dt><dd>{money(o.shipping_cents, o.currency)}</dd></div>
            <div className="flex justify-between font-display text-lg text-gold"><dt>Total</dt><dd>{money(o.total_cents, o.currency)}</dd></div>
          </dl>
          {o.stripe_payment_intent && <p className="mt-3 text-xs text-stone">Stripe: {o.stripe_payment_intent}. Los reembolsos se hacen en el panel de Stripe y aquí se marcan solos.</p>}
        </section>
      </div>

      <form action={updateOrder} className="mt-8 grid gap-4 border border-gold/20 bg-coal p-5">
        <input type="hidden" name="id" value={o.id} />
        <h2 className="font-display text-lg">Preparación y envío</h2>
        <label className="grid gap-1 text-sm">Número de seguimiento
          <input name="tracking" defaultValue={o.tracking ?? ""} className={inputCls} disabled={!editable} />
        </label>
        <label className="grid gap-1 text-sm">Notas internas
          <textarea name="notes" rows={3} defaultValue={o.notes ?? ""} className={inputCls} disabled={!editable} />
        </label>
        {editable && (
          <div className="flex flex-wrap gap-3">
            <button name="intent" value="save" className="border border-gold px-4 py-2 text-xs uppercase tracking-widest text-gold hover:bg-gold/10">Guardar</button>
            {o.status === "paid" && <button name="intent" value="ship" className="bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-abyss">Marcar como enviado</button>}
            {o.status === "shipped" && <button name="intent" value="unship" className="border border-gold px-4 py-2 text-xs uppercase tracking-widest text-gold hover:bg-gold/10">Volver a «Pagado»</button>}
          </div>
        )}
      </form>
    </>
  );
}
