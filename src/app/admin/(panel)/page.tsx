import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Panel · Admin", robots: { index: false } };

async function count(table: string, filter?: (q: any) => any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const sb = await supabaseServer();
  let q = sb.from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: n } = await q;
  return n ?? 0;
}

export default async function Dashboard() {
  const sbOrders = await supabaseServer();
  const { data: paidRows } = await sbOrders.from("orders").select("total_cents").in("status", ["paid", "shipped"]).limit(5000);
  const revenue = (paidRows ?? []).reduce((n, r) => n + r.total_cents, 0);
  const [articles, drafts, review, products, events, requests] = await Promise.all([
    count("articles", (q) => q.eq("status", "published")),
    count("articles", (q) => q.eq("status", "draft")),
    count("articles", (q) => q.eq("status", "pending_review")),
    count("products"),
    count("events", (q) => q.eq("status", "published").gte("starts_at", new Date().toISOString())),
    count("event_registrations"),
  ]);
  const cards: [string, number | string][] = [
    ["Artículos publicados", articles], ["Artículos en borrador", drafts], ["Pendientes de revisión", review],
    ["Productos", products], ["Eventos futuros", events], ["Inscripciones recibidas", requests],
    ["Pedidos pagados", paidRows?.length ?? 0], ["Ingresos (pedidos pagados)", new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(revenue / 100)], ["Visitas", "No conectado"], ["Descargas", "No conectado"],
  ];
  return (
    <>
      <h1 className="font-display text-3xl text-gold">Panel</h1>
      <p className="mt-2 text-sm text-stone">Solo cifras reales de la base de datos. Visitas y descargas se mostrarán al conectar analítica.</p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([l, v]) => (
          <div key={l} className="border border-gold/20 bg-coal p-5">
            <dt className="text-xs uppercase tracking-widest text-stone">{l}</dt>
            <dd className="mt-2 font-display text-3xl">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
