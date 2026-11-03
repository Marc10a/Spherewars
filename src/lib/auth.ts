import { redirect } from "next/navigation";
import { isConfigured, supabaseServer } from "@/lib/supabase/server";

export type Role = "admin" | "editor" | "reviewer";
export type Status = "draft" | "pending_review" | "approved" | "published" | "archived";

export const statusLabels: Record<Status, string> = {
  draft: "Borrador", pending_review: "Pendiente de revisión", approved: "Aprobado", published: "Publicado", archived: "Archivado",
};

/** Transitions each role may perform. Mirrors the DB trigger `enforce_status_transition` (the DB is the authority). */
export function allowedStatuses(role: Role, current: Status): Status[] {
  if (role === "admin") return (Object.keys(statusLabels) as Status[]).filter((s) => s !== current);
  if (role === "editor") return current === "draft" ? ["pending_review"] : current === "pending_review" ? ["draft"] : [];
  if (role === "reviewer") return current === "pending_review" ? ["approved", "draft"] : [];
  return [];
}

export const canWrite = (role: Role) => role === "admin" || role === "editor";

export async function getStaff() {
  if (!isConfigured()) return null;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from("profiles").select("role, display_name").eq("id", user.id).single();
  if (!profile) return null;
  return { id: user.id, email: user.email ?? "", name: profile.display_name as string | null, role: profile.role as Role };
}

export async function requireStaff() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}
