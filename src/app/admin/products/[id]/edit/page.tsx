import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminOrStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";
import DeleteProductButton from "@/components/shared/delete-product-button";
import { deleteProduct } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "প্রোডাক্ট এডিট" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "অনুমোদন অপেক্ষায়",
  APPROVED: "অনুমোদিত",
  REJECTED: "বাতিল",
  INACTIVE: "নিষ্ক্রিয়",
};

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminOrStaff("products");

  const product = await prisma.product.findUnique({
    where: { id, deletedAt: null },
    include: { images: { orderBy: { position: "asc" } }, inventory: true },
  });
  if (!product) notFound();

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/products">
          <ArrowLeft className="size-4" />
          প্রোডাক্ট লিস্টে ফিরুন
        </Link>
      </Button>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">প্রোডাক্ট এডিট</h1>
        <Badge variant="secondary">{STATUS_LABELS[product.status] ?? product.status}</Badge>
      </div>
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        productId={product.id}
        defaults={{
          title: product.title,
          categoryId: product.categoryId,
          price: product.price.toString(),
          compareAtPrice: product.compareAtPrice?.toString() ?? "",
          stock: String(product.inventory.find((i) => i.variantId === null)?.stock ?? 0),
          description: product.description,
          imageUrls: product.images.map((i) => i.url).join("\n"),
          isFlashSale: product.isFlashSale,
          flashSalePrice: product.flashSalePrice?.toString() ?? "",
          status: product.status,
        }}
      />

      <div className="mt-8 border-t pt-4">
        <DeleteProductButton
          action={deleteProduct.bind(null, product.id)}
          redirectTo="/admin/products"
        />
      </div>
    </div>
  );
}
