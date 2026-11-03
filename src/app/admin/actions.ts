"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { allowedStatuses, canWrite, requireStaff, type Status } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { shopSettingsSchema } from "@/lib/shop/settings";
import { getWikiPage } from "@/lib/wiki";

const SECTIONS = { articles: "articulos", products: "productos", events: "eventos", downloadable_resources: "descargas" } as const;
const TABLES = Object.keys(SECTIONS) as (keyof typeof SECTIONS)[];
type Table = keyof typeof SECTIONS;
const STATUSES = ["draft", "pending_review", "approved", "published", "archived"] as const;

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const fail = (to: string, msg: string): never => redirect(`${to}${to.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);

export async function signIn(formData: FormData) {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail("/admin/login", "Datos no válidos");
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword(parsed.data!);
  if (error) fail("/admin/login", "Credenciales incorrectas");
  redirect("/admin");
}

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/admin/login");
}

const articleSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().max(120).optional(),
  locale: z.enum(["es", "en", "ca"]),
  category_id: z.string().uuid().optional().or(z.literal("")),
  md: z.string().max(100_000),
});

export async function saveArticle(formData: FormData) {
  const staff = await requireStaff();
  const raw = Object.fromEntries(formData);
  const back = raw.id ? `/admin/articulos/${raw.id}` : "/admin/articulos/nuevo";
  if (!canWrite(staff.role)) fail(back, "Tu rol no puede editar contenido");
  const p = articleSchema.safeParse(raw);
  if (!p.success) return fail(back, "Revisa los campos: " + p.error.issues.map((i) => i.path.join(".")).join(", "));
  const d = p.data;
  const row = {
    title: d.title, slug: slugify(d.slug || d.title), locale: d.locale,
    category_id: d.category_id || null, body: { md: d.md }, updated_at: new Date().toISOString(),
  };
  const sb = await supabaseServer();
  let id = d.id || "";
  if (id) {
    const { error } = await sb.from("articles").update(row).eq("id", id);
    if (error) fail(back, error.message);
  } else {
    const { data, error } = await sb.from("articles").insert({ ...row, author: staff.id }).select("id").single();
    if (error) return fail(back, error.message);
    id = data.id;
  }
  await sb.from("article_versions").insert({ article_id: id, body: row.body, edited_by: staff.id });
  revalidatePath("/admin/articulos");
  redirect(`/admin/articulos/${id}?saved=1`);
}

const productSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().max(120).optional(),
  category: z.enum(["leader", "fighter", "starter", "accessory"]),
  faction_slug: z.string().optional(),
  description: z.string().max(20_000),
  contents: z.string().max(2000).optional(),
  price: z.string().optional(),
  commercial_status: z.string().trim().min(1).max(60),
  buy_url: z.string().url().optional().or(z.literal("")),
  profile_url: z.string().url().optional().or(z.literal("")),
  publish_at: z.string().optional(),
  image_alt: z.string().trim().max(300).optional(),
  sku: z.string().trim().max(60).optional(),
  wiki_slug: z.string().trim().max(200).optional(),
  stock: z.string().optional(),
  sellable: z.string().optional(),
});

export async function saveProduct(formData: FormData) {
  const staff = await requireStaff();
  const raw = Object.fromEntries(formData);
  const back = raw.id ? `/admin/productos/${raw.id}` : "/admin/productos/nuevo";
  if (!canWrite(staff.role)) fail(back, "Tu rol no puede editar contenido");
  const p = productSchema.safeParse(raw);
  if (!p.success) return fail(back, "Revisa los campos: " + p.error.issues.map((i) => i.path.join(".")).join(", "));
  const d = p.data;
  const sb = await supabaseServer();

  let faction_id: string | null = null;
  if (d.faction_slug) {
    const { data } = await sb.from("factions").select("id").eq("slug", d.faction_slug).single();
    faction_id = data?.id ?? null;
  }
  const price = d.price?.trim() ? Math.round(parseFloat(d.price.replace(",", ".")) * 100) : null;
  if (price !== null && (!Number.isFinite(price) || price < 0)) return fail(back, "Precio no válido");

  const sellable = d.sellable === "on";
  if (sellable && price === null) return fail(back, "Para poner un producto a la venta hay que indicar su precio");
  const stock = d.stock?.trim() ? parseInt(d.stock, 10) : null;
  if (stock !== null && (!Number.isFinite(stock) || stock < 0)) return fail(back, "Stock no válido");

  if (d.wiki_slug && !getWikiPage(d.wiki_slug)) return fail(back, "La miniatura de la wiki indicada no existe: elige una de la lista desplegable");

  const row: Record<string, unknown> = {
    sellable, stock, sku: d.sku || null, wiki_slug: d.wiki_slug || null,
    name: d.name, slug: slugify(d.slug || d.name), category: d.category, faction_id,
    description: { text: d.description }, contents: d.contents || null, price_cents: price,
    commercial_status: d.commercial_status, buy_url: d.buy_url || null, profile_url: d.profile_url || null,
    publish_at: d.publish_at ? new Date(d.publish_at).toISOString() : null, image_alt: d.image_alt || null,
  };

  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return fail(back, "La imagen debe ser JPG, PNG o WebP");
    if (file.size > 5 * 1024 * 1024) return fail(back, "La imagen supera 5 MB");
    if (!d.image_alt) return fail(back, "El texto alternativo de la imagen es obligatorio");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `products/${row.slug}-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("media").upload(path, file, { contentType: file.type });
    if (error) return fail(back, error.message);
    row.image_path = path;
  }

  let id = d.id || "";
  if (id) {
    const { error } = await sb.from("products").update(row).eq("id", id);
    if (error) fail(back, error.message);
  } else {
    const { data, error } = await sb.from("products").insert(row).select("id").single();
    if (error) return fail(back, error.message);
    id = data.id;
  }
  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  redirect(`/admin/productos/${id}?saved=1`);
}

const eventSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().max(120).optional(),
  kind: z.enum(["demo", "tournament", "special", "community", "fair"]),
  starts_at: z.string().min(1),
  ends_at: z.string().optional(),
  organizer: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
  address: z.string().trim().max(300).optional(),
  format: z.string().trim().max(300).optional(),
  requirements: z.string().trim().max(1000).optional(),
  description: z.string().max(20_000).optional(),
  prizes: z.string().trim().max(1000).optional(),
  fee: z.string().optional(),
  capacity: z.string().optional(),
  registration_url: z.string().url().optional().or(z.literal("")),
  registration_open: z.string().optional(),
});

export async function saveEvent(formData: FormData) {
  const staff = await requireStaff();
  const raw = Object.fromEntries(formData);
  const back = raw.id ? `/admin/eventos/${raw.id}` : "/admin/eventos/nuevo";
  if (!canWrite(staff.role)) fail(back, "Tu rol no puede editar contenido");
  const p = eventSchema.safeParse(raw);
  if (!p.success) return fail(back, "Revisa los campos: " + p.error.issues.map((i) => i.path.join(".")).join(", "));
  const d = p.data;
  const fee = d.fee?.trim() ? Math.round(parseFloat(d.fee.replace(",", ".")) * 100) : null;
  const capacity = d.capacity?.trim() ? parseInt(d.capacity, 10) : null;
  if (fee !== null && (!Number.isFinite(fee) || fee < 0)) return fail(back, "Precio no válido");
  if (capacity !== null && (!Number.isFinite(capacity) || capacity < 1)) return fail(back, "Aforo no válido");
  const row = {
    title: d.title, slug: slugify(d.slug || d.title), kind: d.kind,
    starts_at: new Date(d.starts_at).toISOString(), ends_at: d.ends_at ? new Date(d.ends_at).toISOString() : null,
    organizer: d.organizer || null, city: d.city || null, address: d.address || null, format: d.format || null,
    requirements: d.requirements || null, description: d.description || null, prizes: d.prizes || null,
    fee_cents: fee, capacity, registration_url: d.registration_url || null, registration_open: d.registration_open === "on",
  };
  const sb = await supabaseServer();
  let id = d.id || "";
  if (id) {
    const { error } = await sb.from("events").update(row).eq("id", id);
    if (error) fail(back, error.message);
  } else {
    const { data, error } = await sb.from("events").insert(row).select("id").single();
    if (error) return fail(back, error.message);
    id = data.id;
  }
  revalidatePath("/", "layout");
  redirect(`/admin/eventos/${id}?saved=1`);
}

const downloadSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(200),
  category: z.enum(["rules", "profiles", "reference", "extra", "updates", "faq", "errata", "events"]),
  description: z.string().max(1000).optional(),
  version: z.string().trim().max(40).optional(),
  locale: z.enum(["es", "en", "ca"]),
});

export async function saveDownload(formData: FormData) {
  const staff = await requireStaff();
  const raw = Object.fromEntries(formData);
  const back = raw.id ? `/admin/descargas/${raw.id}` : "/admin/descargas/nuevo";
  if (!canWrite(staff.role)) fail(back, "Tu rol no puede editar contenido");
  const p = downloadSchema.safeParse(raw);
  if (!p.success) return fail(back, "Revisa los campos: " + p.error.issues.map((i) => i.path.join(".")).join(", "));
  const d = p.data;
  const sb = await supabaseServer();
  const row: Record<string, unknown> = {
    name: d.name, category: d.category, description: d.description || null, version: d.version || null, locale: d.locale,
    updated_at: new Date().toISOString(),
  };

  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!d.id && !hasFile) return fail(back, "Sube el archivo del documento");
  if (hasFile) {
    const types: Record<string, string> = { "application/pdf": "pdf", "application/zip": "zip", "text/csv": "csv", "image/png": "png", "image/jpeg": "jpg" };
    const ext = types[file.type];
    if (!ext) return fail(back, "Formato no admitido (PDF, ZIP, CSV, PNG o JPG)");
    if (file.size > 50 * 1024 * 1024) return fail(back, "El archivo supera 50 MB");
    const path = `downloads/${slugify(d.name)}-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("media").upload(path, file, { contentType: file.type });
    if (error) return fail(back, error.message);
    Object.assign(row, { storage_path: path, file_type: ext, size_bytes: file.size });
  }

  let id = d.id || "";
  if (id) {
    const { error } = await sb.from("downloadable_resources").update(row).eq("id", id);
    if (error) fail(back, error.message);
  } else {
    const { data, error } = await sb.from("downloadable_resources").insert(row).select("id").single();
    if (error) return fail(back, error.message);
    id = data.id;
  }
  revalidatePath("/", "layout");
  redirect(`/admin/descargas/${id}?saved=1`);
}

export async function changeStatus(formData: FormData) {
  const staff = await requireStaff();
  const table = String(formData.get("table")) as Table;
  const id = z.string().uuid().parse(formData.get("id"));
  const status = String(formData.get("status")) as Status;
  if (!TABLES.includes(table) || !STATUSES.includes(status)) fail("/admin", "Operación no válida");
  const back = `/admin/${SECTIONS[table]}/${id}`;

  const sb = await supabaseServer();
  const { data: current } = await sb.from(table).select("status").eq("id", id).single();
  if (!current || !allowedStatuses(staff.role, current.status as Status).includes(status)) fail(back, "Tu rol no puede hacer ese cambio de estado");
  const { error } = await sb.from(table).update({ status }).eq("id", id); // DB trigger re-checks
  if (error) fail(back, error.message);
  revalidatePath("/", "layout");
  redirect(`${back}?saved=1`);
}

export async function updateOrder(formData: FormData) {
  const staff = await requireStaff();
  const id = z.string().uuid().parse(formData.get("id"));
  const back = `/admin/pedidos/${id}`;
  if (!canWrite(staff.role)) fail(back, "Tu rol no puede gestionar pedidos");
  const intent = String(formData.get("intent") ?? "save");
  const tracking = String(formData.get("tracking") ?? "").trim().slice(0, 120) || null;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000) || null;

  const sb = await supabaseServer();
  const { data: cur } = await sb.from("orders").select("status").eq("id", id).single();
  if (!cur) return fail(back, "Pedido no encontrado");
  const patch: Record<string, unknown> = { tracking, notes };
  if (intent === "ship" || intent === "unship") {
    if (!["paid", "shipped"].includes(cur.status)) return fail(back, "Solo se pueden marcar como enviados los pedidos pagados");
    if (intent === "ship") Object.assign(patch, { status: "shipped", shipped_at: new Date().toISOString() });
    else Object.assign(patch, { status: "paid", shipped_at: null });
  }
  const { error } = await sb.from("orders").update(patch).eq("id", id);
  if (error) return fail(back, error.message);
  revalidatePath("/admin/pedidos");
  redirect(`${back}?saved=1`);
}

const euros = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Math.round(parseFloat(s) * 100);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/** Shipping zones and shop switch (admin only). Four zone slots; empty slots are ignored. */
export async function saveShopSettings(formData: FormData) {
  const staff = await requireStaff();
  const back = "/admin/tienda";
  if (staff.role !== "admin") fail(back, "Solo un administrador puede cambiar los ajustes de la tienda");

  const zones = [];
  const seen = new Map<string, string>();
  for (let i = 1; i <= 4; i++) {
    const label = String(formData.get(`label_${i}`) ?? "").trim();
    const countries = String(formData.get(`countries_${i}`) ?? "").toUpperCase().split(/[\s,;]+/).filter(Boolean);
    if (!label && countries.length === 0) continue;
    const price = euros(formData.get(`price_${i}`));
    const free = euros(formData.get(`free_${i}`));
    if (!label || countries.length === 0 || price === null || Number.isNaN(price) || (free !== null && Number.isNaN(free))) {
      return fail(back, `Zona ${i}: indica nombre, países (códigos de 2 letras, ej. ES, FR) y precio de envío válidos`);
    }
    for (const c of countries) {
      if (seen.has(c)) return fail(back, `El país ${c} está en dos zonas (${seen.get(c)} y ${label})`);
      seen.set(c, label);
    }
    zones.push({ id: `zona-${i}`, label, countries, price_cents: price, free_over_cents: free && free > 0 ? free : null });
  }
  const value = { enabled: formData.get("enabled") === "on", currency: "EUR" as const, zones };
  const parsed = shopSettingsSchema.safeParse(value);
  if (!parsed.success) return fail(back, "Revisa los códigos de país (2 letras mayúsculas) y los importes");
  if (value.enabled && zones.length === 0) return fail(back, "Para abrir la tienda define al menos una zona de envío");

  const sb = await supabaseServer();
  const { error } = await sb.from("site_settings").upsert({ key: "shop", value: parsed.data });
  if (error) return fail(back, error.message);
  revalidatePath("/", "layout");
  redirect(`${back}?saved=1`);
}

export async function deleteRow(formData: FormData) {
  const staff = await requireStaff();
  const table = String(formData.get("table")) as Table;
  const id = z.string().uuid().parse(formData.get("id"));
  if (!TABLES.includes(table)) fail("/admin", "Operación no válida");
  const list = `/admin/${SECTIONS[table]}`;
  if (staff.role !== "admin") fail(list, "Solo un administrador puede eliminar");
  const sb = await supabaseServer();
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) fail(list, error.message);
  revalidatePath("/", "layout");
  redirect(list);
}
