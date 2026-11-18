import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import { toggleBanner, deleteBanner } from "@/lib/actions/admin";
import { BannerForm } from "@/components/admin/banner-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "ব্যানার ম্যানেজমেন্ট" };

const POSITION_LABELS: Record<string, string> = {
  HERO: "হিরো স্লাইডার",
  STRIP: "স্ট্রিপ",
  PROMO: "প্রোমো",
};

export default async function AdminBannersPage() {
  await requireAdminOrStaff("banners");
  const banners = await prisma.banner.findMany({
    orderBy: [{ position: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ব্যানার ম্যানেজমেন্ট</h1>
      </div>

      <div className="mb-8 rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">নতুন ব্যানার</h2>
        <BannerForm />
      </div>

      <h2 className="mb-3 font-semibold">সব ব্যানার ({banners.length})</h2>
      {banners.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          এখনো কোনো ব্যানার নেই — উপরের ফর্ম দিয়ে তৈরি করুন
        </p>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.imageUrl}
                alt={b.title ?? ""}
                className="size-16 rounded-md border object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.title ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {POSITION_LABELS[b.position] ?? b.position} • ক্রম: {b.sortOrder}
                  {b.linkUrl && ` • ${b.linkUrl}`}
                </p>
              </div>
              <Badge variant={b.isActive ? "default" : "secondary"}>
                {b.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
              </Badge>
              <div className="flex gap-2">
                <form action={toggleBanner.bind(null, b.id)}>
                  <Button type="submit" size="sm" variant="outline">
                    {b.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                  </Button>
                </form>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/banners/${b.id}/edit`}>এডিট</Link>
                </Button>
                <form action={deleteBanner.bind(null, b.id)}>
                  <Button type="submit" size="sm" variant="destructive">
                    ডিলিট
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
