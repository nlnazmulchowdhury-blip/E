import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCategories } from "@/lib/data";
import { requireAdminOrStaff } from "@/lib/permissions";
import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "নতুন প্রোডাক্ট" };

export default async function NewProductPage() {
  await requireAdminOrStaff("products");

  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/products">
          <ArrowLeft className="size-4" />
          প্রোডাক্ট লিস্টে ফিরুন
        </Link>
      </Button>
      <h1 className="mb-6 text-2xl font-bold">নতুন প্রোডাক্ট</h1>
      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
