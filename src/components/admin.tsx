import { allowedStatuses, statusLabels, type Role, type Status } from "@/lib/auth";
import { changeStatus, deleteRow } from "@/app/admin/actions";

export const inputCls = "w-full border border-gold/40 bg-coal px-3 py-2 text-ivory";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs text-stone">{hint}</span>}
    </label>
  );
}

export function Flash({ error, saved }: { error?: string; saved?: string }) {
  if (error) return <p role="alert" className="mb-6 border border-ember bg-ember/20 p-3 text-sm">{error}</p>;
  if (saved) return <p role="status" className="mb-6 border border-gold/50 bg-gold/10 p-3 text-sm">Guardado.</p>;
  return null;
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className="border border-gold/40 px-2 py-0.5 text-xs uppercase tracking-widest text-gold">{statusLabels[status]}</span>;
}

/** Editorial workflow controls: only transitions the role may perform (DB trigger enforces the same rules). */
export function WorkflowPanel({ table, id, status, role }: { table: "articles" | "products" | "events" | "downloadable_resources"; id: string; status: Status; role: Role }) {
  const next = allowedStatuses(role, status);
  return (
    <section aria-label="Flujo editorial" className="mt-10 border border-gold/20 bg-coal p-5">
      <h2 className="font-display text-lg">Flujo editorial</h2>
      <p className="mt-1 text-sm">Estado actual: <StatusBadge status={status} /></p>
      <div className="mt-4 flex flex-wrap gap-3">
        {next.length === 0 && <p className="text-sm text-stone">Tu rol no puede cambiar el estado desde aquí.</p>}
        {next.map((s) => (
          <form key={s} action={changeStatus}>
            <input type="hidden" name="table" value={table} /><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} />
            <button className="border border-gold px-4 py-2 text-xs uppercase tracking-widest text-gold hover:bg-gold/10">→ {statusLabels[s]}</button>
          </form>
        ))}
        {role === "admin" && (
          <form action={deleteRow} className="ml-auto">
            <input type="hidden" name="table" value={table} /><input type="hidden" name="id" value={id} />
            <button className="border border-ember px-4 py-2 text-xs uppercase tracking-widest text-ember hover:bg-ember/10">Eliminar</button>
          </form>
        )}
      </div>
    </section>
  );
}
