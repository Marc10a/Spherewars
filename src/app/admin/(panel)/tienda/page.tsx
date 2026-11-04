import { getStaff } from "@/lib/auth";
import { shopReadiness } from "@/lib/shop/settings";
import { Field, Flash, inputCls } from "@/components/admin";
import { saveShopSettings } from "@/app/admin/actions";

export const metadata = { title: "Tienda · Admin", robots: { index: false } };

const SLOTS = [1, 2, 3, 4];

export default async function ShopSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  const staff = await getStaff();
  const r = await shopReadiness();
  const isAdmin = staff?.role === "admin";
  const euros = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));

  const checks: [string, boolean, string][] = [
    ["Base de datos conectada", r.database, "Variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    ["Clave de servidor de Supabase", r.server, "Variable SUPABASE_SERVICE_ROLE_KEY (solo en el servidor, nunca pública)"],
    ["Clave secreta de Stripe", r.stripe, "Variable STRIPE_SECRET_KEY"],
    ["Secreto del webhook de Stripe", r.webhook, "Variable STRIPE_WEBHOOK_SECRET (Stripe → Developers → Webhooks)"],
    ["Dirección pública de la web", r.siteUrl, "Variable NEXT_PUBLIC_SITE_URL, por ejemplo https://spherewars.es"],
    ["Al menos una zona de envío", r.shipping, "Configúrala más abajo"],
    ["Tienda activada", r.settings.enabled, "Casilla «Tienda abierta» más abajo"],
  ];

  return (
    <>
      <h1 className="font-display text-3xl text-gold">Ajustes de la tienda</h1>
      <p className="mt-2 text-sm text-stone">Los pagos solo se ofrecen al público cuando todos los puntos de esta lista están en verde.</p>
      <div className="mt-6"><Flash error={error} saved={saved} /></div>

      <ul className="mb-10 divide-y divide-gold/10 border border-gold/20 bg-coal text-sm" aria-label="Estado de la tienda">
        {checks.map(([label, ok, hint]) => (
          <li key={label} className="flex items-start gap-3 p-3">
            <span aria-hidden className={ok ? "text-gold" : "text-ember"}>{ok ? "✔" : "✘"}</span>
            <span><span className="sr-only">{ok ? "Correcto: " : "Pendiente: "}</span>{label}{!ok && <span className="block text-xs text-stone">{hint}</span>}</span>
          </li>
        ))}
        <li className={`p-3 font-display ${r.canCheckout ? "text-gold" : "text-stone"}`}>{r.canCheckout ? "La tienda está abierta: los clientes pueden pagar." : "La tienda está cerrada para pagos."}</li>
      </ul>

      <form action={saveShopSettings} className="grid gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={r.settings.enabled} disabled={!isAdmin} /> Tienda abierta (aceptar pagos)
        </label>

        <p className="text-sm text-stone">
          Envíos por zonas. Escribe los países con su código de 2 letras separados por comas (ES, FR, PT…). Un país solo puede estar en una zona.
          Los precios de venta son finales (IVA incluido). «Gratis desde» es opcional.
        </p>

        {SLOTS.map((i) => {
          const z = r.settings.zones[i - 1];
          return (
            <fieldset key={i} className="grid gap-4 border border-gold/20 p-4 sm:grid-cols-2">
              <legend className="px-2 text-sm text-gold">Zona {i}</legend>
              <Field label="Nombre (se ve en el pago)"><input name={`label_${i}`} defaultValue={z?.label ?? ""} className={inputCls} disabled={!isAdmin} /></Field>
              <Field label="Países"><input name={`countries_${i}`} defaultValue={z?.countries.join(", ") ?? ""} className={inputCls} disabled={!isAdmin} placeholder="ES, PT" /></Field>
              <Field label="Gastos de envío (€)"><input name={`price_${i}`} inputMode="decimal" defaultValue={euros(z?.price_cents)} className={inputCls} disabled={!isAdmin} /></Field>
              <Field label="Envío gratis desde (€, opcional)"><input name={`free_${i}`} inputMode="decimal" defaultValue={euros(z?.free_over_cents)} className={inputCls} disabled={!isAdmin} /></Field>
            </fieldset>
          );
        })}

        {isAdmin
          ? <button className="justify-self-start bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-abyss">Guardar</button>
          : <p className="text-sm text-stone">Solo un administrador puede cambiar estos ajustes.</p>}
      </form>
    </>
  );
}
