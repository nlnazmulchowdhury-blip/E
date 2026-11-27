import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import { BannerForm } from "@/components/admin/banner-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "ব্যানার ম্যানেজমেন্ট" };

export default async function AdminBannersPage() {
  await requireAdminOrStaff("banners");
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true, slug: true },
    orderBy: { title: "asc" },
    take: 500,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ব্যানার ম্যানেজমেন্ট</h1>
        <Link href="/admin/banners/all" className="text-sm font-medium underline">
          সব ব্যানার দেখুন
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">নতুন ব্যানার</h2>
        <BannerForm products={products} />
      </div>
    </div>
  );
}
