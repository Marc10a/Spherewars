import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getStaff, canWrite } from "@/lib/auth";
import { Flash } from "@/components/admin";
import { ArticleForm } from "../ArticleForm";

export default async function NewArticle({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await getStaff();
  if (!staff || !canWrite(staff.role)) redirect("/admin/articulos");
  const { error } = await searchParams;
  const sb = await supabaseServer();
  const { data: categories } = await sb.from("article_categories").select("id, slug, name").order("slug");
  return (
    <>
      <h1 className="mb-6 font-display text-3xl text-gold">Nuevo artículo</h1>
      <Flash error={error} />
      <ArticleForm categories={categories ?? []} />
    </>
  );
}
