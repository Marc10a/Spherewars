import { isConfigured } from "@/lib/supabase/server";
import { signIn } from "../actions";

export const metadata = { title: "Acceso · Admin", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto mt-24 max-w-sm px-4 text-ivory">
      <h1 className="font-display text-3xl tracking-widest text-gold">SPHEREWARS</h1>
      <p className="mt-1 text-sm text-stone">Panel de administración</p>

      {!isConfigured() ? (
        <p role="alert" className="mt-8 border border-dashed border-gold/40 p-4 text-sm text-stone">
          Supabase no está configurado. Define <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (ver docs/SETUP.md).
        </p>
      ) : (
        <form action={signIn} className="mt-8 grid gap-4">
          {error && <p role="alert" className="border border-ember bg-ember/20 p-3 text-sm">{error}</p>}
          <label className="grid gap-1 text-sm">Correo
            <input name="email" type="email" required autoComplete="username" className="border border-gold/40 bg-coal px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">Contraseña
            <input name="password" type="password" required autoComplete="current-password" className="border border-gold/40 bg-coal px-3 py-2" />
          </label>
          <button className="bg-gold px-4 py-3 text-xs font-semibold uppercase tracking-widest text-abyss">Entrar</button>
        </form>
      )}
    </div>
  );
}
