import { redirect } from "next/navigation";
import { getStaff, canWrite } from "@/lib/auth";
import { Flash } from "@/components/admin";
import { DownloadForm } from "../DownloadForm";

export default async function NewDownload({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await getStaff();
  if (!staff || !canWrite(staff.role)) redirect("/admin/descargas");
  const { error } = await searchParams;
  return (
    <>
      <h1 className="mb-6 font-display text-3xl text-gold">Nueva descarga</h1>
      <Flash error={error} />
      <DownloadForm />
    </>
  );
}
