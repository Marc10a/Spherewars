import { saveDownload } from "@/app/admin/actions";
import { Field, inputCls } from "@/components/admin";
import { downloadCategories, formatBytes } from "@/lib/data";

export type DownloadValue = {
  id: string; name: string; category: string; description: string | null; version: string | null; locale: string | null;
  file_type: string | null; size_bytes: number | null; storage_path: string;
};

export function DownloadForm({ value, readOnly }: { value?: DownloadValue; readOnly?: boolean }) {
  const d = readOnly;
  return (
    <form action={saveDownload} className="grid gap-5">
      {value && <input type="hidden" name="id" value={value.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre"><input name="name" required defaultValue={value?.name} className={inputCls} disabled={d} /></Field>
        <Field label="Categoría">
          <select name="category" defaultValue={value?.category ?? "rules"} className={inputCls} disabled={d}>
            {Object.entries(downloadCategories).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Versión"><input name="version" defaultValue={value?.version ?? ""} className={inputCls} disabled={d} /></Field>
        <Field label="Idioma">
          <select name="locale" defaultValue={value?.locale ?? "es"} className={inputCls} disabled={d}>
            <option value="es">Español</option><option value="en">English</option><option value="ca">Català</option>
          </select>
        </Field>
      </div>
      <Field label="Descripción"><textarea name="description" rows={3} defaultValue={value?.description ?? ""} className={inputCls} disabled={d} /></Field>
      <Field label={value ? "Reemplazar archivo (opcional)" : "Archivo (PDF, ZIP, CSV, PNG, JPG; máx. 50 MB)"} hint={value ? `Actual: ${value.file_type?.toUpperCase()} · ${formatBytes(value.size_bytes)}` : undefined}>
        <input name="file" type="file" required={!value} accept=".pdf,.zip,.csv,.png,.jpg,.jpeg" className={inputCls} disabled={d} />
      </Field>
      {!d && <button className="justify-self-start bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-abyss">Guardar</button>}
    </form>
  );
}
