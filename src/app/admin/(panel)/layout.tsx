import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { signOut } from "../actions";

const roleLabel = { admin: "Administrador", editor: "Editor", reviewer: "Revisor" } as const;

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <div className="min-h-screen text-ivory">
      <header className="border-b border-gold/20 bg-coal">
        <nav aria-label="Administración" className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-4 py-3 text-sm">
          <span className="font-display tracking-widest text-gold">SPHEREWARS · ADMIN</span>
          <Link href="/admin" className="hover:text-gold">Panel</Link>
          <Link href="/admin/articulos" className="hover:text-gold">Artículos</Link>
          <Link href="/admin/productos" className="hover:text-gold">Miniaturas</Link>
          <Link href="/admin/eventos" className="hover:text-gold">Eventos</Link>
          <Link href="/admin/descargas" className="hover:text-gold">Descargas</Link>
          <Link href="/admin/pedidos" className="hover:text-gold">Pedidos</Link>
          <Link href="/admin/tienda" className="hover:text-gold">Tienda</Link>
          <span className="ml-auto text-xs text-stone">{staff.email} · {roleLabel[staff.role]}</span>
          <form action={signOut}><button className="text-xs uppercase tracking-widest text-stone hover:text-ivory">Salir</button></form>
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-10">{children}</div>
    </div>
  );
}
