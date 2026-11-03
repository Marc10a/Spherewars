import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getStaff, canWrite, type Status } from "@/lib/auth";
import { Flash, StatusBadge } from "@/components/admin";

export default async function Products({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const staff = await getStaff();
  const sb = await supabaseServer();
  const { data } = await sb.from("products").select("id, name, category, status, publish_at").order("name");
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-gold">Miniaturas y productos</h1>
        {staff && canWrite(staff.role) && <Link href="/admin/productos/nuevo" className="bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-widest text-abyss">Nuevo</Link>}
      </div>
      <div className="mt-6"><Flash error={error} /></div>
      <ul className="divide-y divide-gold/10 border border-gold/20 bg-coal">
        {(data ?? []).length === 0 && <li className="p-5 text-sm text-stone">Sin productos todavía.</li>}
        {(data ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 p-4">
            <Link href={`/admin/productos/${p.id}`} className="hover:text-gold">{p.name} <span className="text-xs text-stone">{p.category}{p.publish_at ? ` · embargo hasta ${new Date(p.publish_at).toLocaleString("es-ES")}` : ""}</span></Link>
            <StatusBadge status={p.status as Status} />
          </li>
        ))}
      </ul>
    </>
  );
}
