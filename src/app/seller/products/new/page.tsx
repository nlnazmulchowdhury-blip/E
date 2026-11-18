import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SellerProductForm } from "@/components/seller/seller-product-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "নতুন প্রোডাক্ট" };

export default async function SellerNewProductPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/access-denied");

  const profile = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile || profile.status !== "APPROVED") redirect("/access-denied");

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/seller/products">
          <ArrowLeft className="size-4" />
          প্রোডাক্ট লিস্টে ফিরুন
        </Link>
      </Button>
      <h1 className="mb-2 text-2xl font-bold">নতুন প্রোডাক্ট</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        জমা দেওয়ার পর অ্যাডমিন অনুমোদন দিলে প্রোডাক্টটি সাইটে দেখাবে
      </p>
      <SellerProductForm categories={categories} />
    </div>
  );
}
