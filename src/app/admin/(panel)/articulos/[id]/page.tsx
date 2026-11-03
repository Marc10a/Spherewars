import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { canWrite, requireStaff, type Status } from "@/lib/auth";
import { Flash, WorkflowPanel } from "@/components/admin";
import { RichText } from "@/components/RichText";
import { ArticleForm } from "../ArticleForm";

export default async function EditArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const staff = await requireStaff();
  const sb = await supabaseServer();
  const [{ data: a }, { data: categories }] = await Promise.all([
    sb.from("articles").select("id, title, slug, locale, category_id, body, status").eq("id", id).maybeSingle(),
    sb.from("article_categories").select("id, slug, name").order("slug"),
  ]);
  if (!a) notFound();
  return (
    <>
      <h1 className="mb-6 font-display text-3xl text-gold">{a.title}</h1>
      <Flash error={error} saved={saved} />
      <ArticleForm categories={categories ?? []} value={a} readOnly={!canWrite(staff.role)} />
      <WorkflowPanel table="articles" id={a.id} status={a.status as Status} role={staff.role} />
      <section aria-label="Vista previa" className="mt-10">
        <h2 className="font-display text-lg">Vista previa</h2>
        <div className="mt-3 border border-gold/20 bg-coal p-6">
          <h3 className="mb-4 font-display text-2xl">{a.title}</h3>
          <RichText md={a.body?.md} />
        </div>
      </section>
    </>
  );
}
