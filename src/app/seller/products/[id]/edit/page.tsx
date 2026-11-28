import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SellerProductForm } from "@/components/seller/seller-product-form";
import DeleteProductButton from "@/components/shared/delete-product-button";
import { deleteSellerProduct } from "@/lib/actions/seller";
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

export default async function SellerEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/access-denied");

  const profile = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile || profile.status !== "APPROVED") redirect("/access-denied");

  // Ownership চেক: অন্যের প্রোডাক্ট এডিট পেজও খোলা যাবে না
  const product = await prisma.product.findUnique({
    where: { id, sellerId: profile.id, deletedAt: null },
    include: { images: { orderBy: { position: "asc" } }, inventory: true },
  });
  if (!product) notFound();

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/seller/products">
          <ArrowLeft className="size-4" />
          প্রোডাক্ট লিস্টে ফিরুন
        </Link>
      </Button>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">প্রোডাক্ট এডিট</h1>
        <Badge variant="secondary">{STATUS_LABELS[product.status] ?? product.status}</Badge>
      </div>
      <SellerProductForm
        categories={categories}
        productId={product.id}
        defaults={{
          title: product.title,
          description: product.description,
          price: product.price.toString(),
          compareAtPrice: product.compareAtPrice?.toString() ?? "",
          stock: String(product.inventory[0]?.stock ?? 0),
          imageUrls: product.images.map((i) => i.url).join("\n"),
          categoryId: product.categoryId,
        }}
      />

      <div className="mt-8 border-t pt-4">
        <DeleteProductButton
          action={deleteSellerProduct.bind(null, product.id)}
          redirectTo="/seller/products"
        />
      </div>
    </div>
  );
}
