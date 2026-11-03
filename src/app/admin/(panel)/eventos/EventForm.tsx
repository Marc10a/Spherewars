import { saveEvent } from "@/app/admin/actions";
import { Field, inputCls } from "@/components/admin";
import { eventKinds } from "@/lib/data";

export type EventValue = {
  id: string; title: string; slug: string; kind: string; starts_at: string; ends_at: string | null; organizer: string | null;
  city: string | null; address: string | null; format: string | null; requirements: string | null; description: string | null;
  prizes: string | null; fee_cents: number | null; capacity: number | null; registration_url: string | null; registration_open: boolean;
};

const local = (iso: string | null | undefined) => (iso ? iso.slice(0, 16) : "");

export function EventForm({ value, readOnly }: { value?: EventValue; readOnly?: boolean }) {
  const d = readOnly;
  return (
    <form action={saveEvent} className="grid gap-5">
      {value && <input type="hidden" name="id" value={value.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre"><input name="title" required defaultValue={value?.title} className={inputCls} disabled={d} /></Field>
        <Field label="Slug" hint="Vacío = a partir del nombre"><input name="slug" defaultValue={value?.slug} className={inputCls} disabled={d} /></Field>
        <Field label="Tipo">
          <select name="kind" defaultValue={value?.kind ?? "demo"} className={inputCls} disabled={d}>
            {Object.entries(eventKinds).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Tienda u organizador"><input name="organizer" defaultValue={value?.organizer ?? ""} className={inputCls} disabled={d} /></Field>
        <Field label="Inicio"><input name="starts_at" type="datetime-local" required defaultValue={local(value?.starts_at)} className={inputCls} disabled={d} /></Field>
        <Field label="Fin"><input name="ends_at" type="datetime-local" defaultValue={local(value?.ends_at)} className={inputCls} disabled={d} /></Field>
        <Field label="Ciudad"><input name="city" defaultValue={value?.city ?? ""} className={inputCls} disabled={d} /></Field>
        <Field label="Dirección"><input name="address" defaultValue={value?.address ?? ""} className={inputCls} disabled={d} /></Field>
        <Field label="Formato"><input name="format" defaultValue={value?.format ?? ""} className={inputCls} disabled={d} /></Field>
        <Field label="Requisitos"><input name="requirements" defaultValue={value?.requirements ?? ""} className={inputCls} disabled={d} /></Field>
        <Field label="Precio de inscripción (€)" hint="Vacío = sin dato"><input name="fee" inputMode="decimal" defaultValue={value?.fee_cents != null ? (value.fee_cents / 100).toFixed(2) : ""} className={inputCls} disabled={d} /></Field>
        <Field label="Premios"><input name="prizes" defaultValue={value?.prizes ?? ""} className={inputCls} disabled={d} /></Field>
      </div>
      <Field label="Descripción"><textarea name="description" rows={6} defaultValue={value?.description ?? ""} className={inputCls} disabled={d} /></Field>
      <fieldset className="grid gap-4 border border-gold/20 p-4">
        <legend className="px-2 text-sm text-gold">Inscripción</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="registration_open" defaultChecked={value?.registration_open} disabled={d} /> Inscripción propia en esta web (respeta el aforo)
        </label>
        <Field label="Aforo (plazas)" hint="Solo se muestran plazas si defines el aforo y activas la inscripción propia"><input name="capacity" inputMode="numeric" defaultValue={value?.capacity ?? ""} className={inputCls} disabled={d} /></Field>
        <Field label="O enlace de inscripción externo"><input name="registration_url" type="url" defaultValue={value?.registration_url ?? ""} className={inputCls} disabled={d} /></Field>
      </fieldset>
      {!d && <button className="justify-self-start bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-abyss">Guardar</button>}
    </form>
  );
}
