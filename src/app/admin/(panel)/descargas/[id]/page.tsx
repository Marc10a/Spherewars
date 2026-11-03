import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { canWrite, requireStaff, type Status } from "@/lib/auth";
import { Flash, WorkflowPanel } from "@/components/admin";
import { DownloadForm, type DownloadValue } from "../DownloadForm";

export default async function EditDownload({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const staff = await requireStaff();
  const sb = await supabaseServer();
  const { data } = await sb.from("downloadable_resources").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const d = data as DownloadValue & { status: Status };
  return (
    <>
      <h1 className="mb-6 font-display text-3xl text-gold">{d.name}</h1>
      <Flash error={error} saved={saved} />
      <DownloadForm value={d} readOnly={!canWrite(staff.role)} />
      <WorkflowPanel table="downloadable_resources" id={d.id} status={d.status} role={staff.role} />
    </>
  );
}
