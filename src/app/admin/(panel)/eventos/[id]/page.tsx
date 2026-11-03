import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { canWrite, requireStaff, type Status } from "@/lib/auth";
import { Flash, WorkflowPanel } from "@/components/admin";
import { EventForm, type EventValue } from "../EventForm";

export default async function EditEvent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const staff = await requireStaff();
  const sb = await supabaseServer();
  const [{ data }, { data: regs }] = await Promise.all([
    sb.from("events").select("*").eq("id", id).maybeSingle(),
    sb.from("event_registrations").select("id, name, email, created_at").eq("event_id", id).order("created_at"),
  ]);
  if (!data) notFound();
  const e = data as EventValue & { status: Status };
  return (
    <>
      <h1 className="mb-6 font-display text-3xl text-gold">{e.title}</h1>
      <Flash error={error} saved={saved} />
      <EventForm value={e} readOnly={!canWrite(staff.role)} />
      <WorkflowPanel table="events" id={e.id} status={e.status} role={staff.role} />
      <section aria-label="Inscripciones" className="mt-10">
        <h2 className="font-display text-lg">Inscripciones ({regs?.length ?? 0}{e.capacity ? ` / ${e.capacity}` : ""})</h2>
        <ul className="mt-3 divide-y divide-gold/10 border border-gold/20 bg-coal text-sm">
          {(regs ?? []).length === 0 && <li className="p-4 text-stone">Sin inscripciones.</li>}
          {(regs ?? []).map((r) => <li key={r.id} className="p-3">{r.name} · {r.email}</li>)}
        </ul>
      </section>
    </>
  );
}
