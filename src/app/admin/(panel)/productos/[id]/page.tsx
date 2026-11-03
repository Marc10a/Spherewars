import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { canWrite, requireStaff, type Status } from "@/lib/auth";
import { Flash, WorkflowPanel } from "@/components/admin";
import { ProductForm, type ProductValue } from "../ProductForm";

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const staff = await requireStaff();
  const sb = await supabaseServer();
  const { data } = await sb.from("products")
    .select("id, name, slug, category, description, contents, price_cents, commercial_status, buy_url, profile_url, publish_at, image_alt, sku, stock, sellable, wiki_slug, status, factions(slug)")
    .eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as unknown as ProductValue & { status: Status };
  return (
    <>
      <h1 className="mb-6 font-display text-3xl text-gold">{p.name}</h1>
      <Flash error={error} saved={saved} />
      <ProductForm value={p} readOnly={!canWrite(staff.role)} />
      <WorkflowPanel table="products" id={p.id} status={p.status} role={staff.role} />
    </>
  );
}
