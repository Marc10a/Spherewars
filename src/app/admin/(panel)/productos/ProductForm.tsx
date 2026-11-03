import { saveProduct } from "@/app/admin/actions";
import { Field, inputCls } from "@/components/admin";
import { factions } from "@/content/factions";
import { wikiPages } from "@/lib/wiki";

export type ProductValue = {
  id: string; name: string; slug: string; category: string; description: { text?: string } | null; contents: string | null;
  price_cents: number | null; commercial_status: string; buy_url: string | null; profile_url: string | null;
  publish_at: string | null; image_alt: string | null; factions: { slug: string } | null;
  sku: string | null; stock: number | null; sellable: boolean; wiki_slug: string | null;
};

export function ProductForm({ value, readOnly }: { value?: ProductValue; readOnly?: boolean }) {
  const d = readOnly;
  return (
    <form action={saveProduct} className="grid gap-5">
      {value && <input type="hidden" name="id" value={value.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre oficial"><input name="name" required defaultValue={value?.name} className={inputCls} disabled={d} /></Field>
        <Field label="Slug" hint="Vacío = a partir del nombre"><input name="slug" defaultValue={value?.slug} className={inputCls} disabled={d} /></Field>
        <Field label="Facción">
          <select name="faction_slug" defaultValue={value?.factions?.slug ?? ""} className={inputCls} disabled={d}>
            <option value="">—</option>
            {factions.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="Categoría">
          <select name="category" defaultValue={value?.category ?? "fighter"} className={inputCls} disabled={d}>
            <option value="leader">Líder</option><option value="fighter">Luchador</option>
            <option value="starter">Starter Pack</option><option value="accessory">Accesorio</option>
          </select>
        </Field>
        <Field label="Estado comercial"><input name="commercial_status" required defaultValue={value?.commercial_status ?? "announced"} className={inputCls} disabled={d} /></Field>
        <Field label="Precio (€)" hint="Solo si está confirmado oficialmente"><input name="price" inputMode="decimal" defaultValue={value?.price_cents != null ? (value.price_cents / 100).toFixed(2) : ""} className={inputCls} disabled={d} /></Field>
        <Field label="Enlace de compra"><input name="buy_url" type="url" defaultValue={value?.buy_url ?? ""} className={inputCls} disabled={d} /></Field>
        <Field label="Perfil descargable (URL)"><input name="profile_url" type="url" defaultValue={value?.profile_url ?? ""} className={inputCls} disabled={d} /></Field>
        <Field label="Publicar a partir de" hint="Embargo: el producto no es visible antes de esta fecha aunque esté publicado">
          <input name="publish_at" type="datetime-local" defaultValue={value?.publish_at ? value.publish_at.slice(0, 16) : ""} className={inputCls} disabled={d} />
        </Field>
      </div>
      <fieldset className="grid gap-4 border border-gold/20 p-4">
        <legend className="px-2 text-sm text-gold">Tienda online</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sellable" defaultChecked={value?.sellable} disabled={d} /> A la venta en la tienda (necesita precio y estado «Publicado»)
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Stock" hint="Vacío = sin límite (bajo pedido). 0 = agotado. Baja solo al confirmarse cada pago.">
            <input name="stock" inputMode="numeric" defaultValue={value?.stock ?? ""} className={inputCls} disabled={d} />
          </Field>
          <Field label="SKU (opcional)"><input name="sku" defaultValue={value?.sku ?? ""} className={inputCls} disabled={d} /></Field>
        </div>
        <Field label="Miniatura de la wiki a la que corresponde" hint="Empieza a escribir el nombre. Así el producto sale con su botón de compra dentro de su facción en la tienda. Vacío = aparece en «Packs, accesorios y otros».">
          <input name="wiki_slug" list="wiki-minis" defaultValue={value?.wiki_slug ?? ""} className={inputCls} disabled={d} autoComplete="off" />
        </Field>
        <datalist id="wiki-minis">
          {wikiPages.filter((p) => p.category === "personajes").map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
        </datalist>
      </fieldset>
      <Field label="Descripción"><textarea name="description" rows={6} defaultValue={value?.description?.text} className={inputCls} disabled={d} /></Field>
      <Field label="Contenido del producto"><input name="contents" defaultValue={value?.contents ?? ""} className={inputCls} disabled={d} /></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Fotografía oficial (JPG/PNG/WebP, máx. 5 MB)"><input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={inputCls} disabled={d} /></Field>
        <Field label="Texto alternativo de la imagen"><input name="image_alt" defaultValue={value?.image_alt ?? ""} className={inputCls} disabled={d} /></Field>
      </div>
      {!d && <button className="justify-self-start bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-abyss">Guardar</button>}
    </form>
  );
}
