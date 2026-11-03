import { redirect } from "next/navigation";
import { getStaff, canWrite } from "@/lib/auth";
import { Flash } from "@/components/admin";
import { EventForm } from "../EventForm";

export default async function NewEvent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await getStaff();
  if (!staff || !canWrite(staff.role)) redirect("/admin/eventos");
  const { error } = await searchParams;
  return (
    <>
      <h1 className="mb-6 font-display text-3xl text-gold">Nuevo evento</h1>
      <Flash error={error} />
      <EventForm />
    </>
  );
}
