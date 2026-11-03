import { redirect } from "next/navigation";
import { getStaff, canWrite } from "@/lib/auth";
import { Flash } from "@/components/admin";
import { ProductForm } from "../ProductForm";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await getStaff();
  if (!staff || !canWrite(staff.role)) redirect("/admin/productos");
  const { error } = await searchParams;
  return (
    <>
      <h1 className="mb-6 font-display text-3xl text-gold">Nuevo producto</h1>
      <Flash error={error} />
      <ProductForm />
    </>
  );
}
