import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import { BannerForm } from "@/components/admin/banner-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "ব্যানার এডিট" };

export default async function AdminEditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminOrStaff("banners");

  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/banners">
          <ArrowLeft className="size-4" />
          ব্যানার লিস্টে ফিরুন
        </Link>
      </Button>
      <h1 className="mb-6 text-2xl font-bold">ব্যানার এডিট</h1>
      <div className="rounded-xl border bg-card p-5">
        <BannerForm
          bannerId={banner.id}
          defaults={{
            title: banner.title ?? "",
            subtitle: banner.subtitle ?? "",
            imageUrl: banner.imageUrl,
            linkUrl: banner.linkUrl ?? "",
            position: banner.position,
            sortOrder: String(banner.sortOrder),
            isActive: banner.isActive,
          }}
        />
      </div>
    </div>
  );
}
