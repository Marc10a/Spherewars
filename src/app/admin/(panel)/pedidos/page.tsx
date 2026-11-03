import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Flash } from "@/components/admin";
import { orderStatusLabels } from "@/lib/shop/labels";

const money = (c: number, cur = "EUR") => new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(c / 100);

export default async function Orders({ searchParams }: { searchParams: Promise<{ estado?: string; error?: string }> }) {
  const { estado, error } = await searchParams;
  const sb = await supabaseServer();
  let q = sb.from("orders").select("id, number, status, email, customer_name, total_cents, currency, shipping_country, created_at").order("created_at", { ascending: false }).limit(200);
  if (estado && estado in orderStatusLabels) q = q.eq("status", estado);
  const { data } = await q;
  const chip = (a: boolean) => `border px-3 py-1 text-xs uppercase tracking-widest ${a ? "border-gold bg-gold text-abyss" : "border-gold/40 hover:border-gold"}`;

  return (
    <>
      <h1 className="font-display text-3xl text-gold">Pedidos</h1>
      <p className="mt-2 text-sm text-stone">Los pedidos se crean al iniciar el pago y pasan a «Pagado» solo cuando Stripe lo confirma.</p>
      <div className="my-6 flex flex-wrap gap-2">
        <Link href="/admin/pedidos" className={chip(!estado)}>Todos</Link>
        {Object.entries(orderStatusLabels).map(([k, l]) => <Link key={k} href={`/admin/pedidos?estado=${k}`} className={chip(estado === k)}>{l}</Link>)}
      </div>
      <Flash error={error} />
      <ul className="divide-y divide-gold/10 border border-gold/20 bg-coal">
        {(data ?? []).length === 0 && <li className="p-5 text-sm text-stone">Sin pedidos todavía.</li>}
        {(data ?? []).map((o) => (
          <li key={o.id}>
            <Link href={`/admin/pedidos/${o.id}`} className="grid gap-1 p-4 hover:bg-gold/5 sm:grid-cols-[6rem_1fr_auto_9rem] sm:items-center">
              <span className="font-display text-gold">#{o.number}</span>
              <span>{o.customer_name || o.email || "—"}<span className="block text-xs text-stone">{new Date(o.created_at).toLocaleString("es-ES")} · {o.shipping_country ?? ""}</span></span>
              <span className="font-display">{money(o.total_cents, o.currency)}</span>
              <span className="text-xs uppercase tracking-widest text-ice">{orderStatusLabels[o.status]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
