import { saveArticle } from "@/app/admin/actions";
import { Field, inputCls } from "@/components/admin";

type Props = {
  categories: { id: string; slug: string; name: Record<string, string> }[];
  value?: { id: string; title: string; slug: string; locale: string; category_id: string | null; body: { md?: string } | null };
  readOnly?: boolean;
};

export function ArticleForm({ categories, value, readOnly }: Props) {
  return (
    <form action={saveArticle} className="grid gap-5">
      {value && <input type="hidden" name="id" value={value.id} />}
      <Field label="Título"><input name="title" required defaultValue={value?.title} className={inputCls} disabled={readOnly} /></Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Slug" hint="Vacío = a partir del título"><input name="slug" defaultValue={value?.slug} className={inputCls} disabled={readOnly} /></Field>
        <Field label="Idioma">
          <select name="locale" defaultValue={value?.locale ?? "es"} className={inputCls} disabled={readOnly}>
            <option value="es">Español</option><option value="en">English</option><option value="ca">Català</option>
          </select>
        </Field>
        <Field label="Categoría">
          <select name="category_id" defaultValue={value?.category_id ?? ""} className={inputCls} disabled={readOnly}>
            <option value="">— Sin categoría —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name.es}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Contenido" hint="Texto plano. '## ' título, '### ' subtítulo, '> ' cita, '- ' lista, línea en blanco = párrafo. Solo contenido canónico oficial.">
        <textarea name="md" rows={18} defaultValue={value?.body?.md} className={`${inputCls} font-mono`} disabled={readOnly} />
      </Field>
      {!readOnly && <button className="justify-self-start bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-widest text-abyss">Guardar</button>}
    </form>
  );
}
