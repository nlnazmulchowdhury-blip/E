import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CouponForm } from "@/components/admin/coupon-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "কুপন এডিট" };

function toInput(date: Date | null) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) notFound();

  return (
    <div className="max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/admin/coupons">
          <ArrowLeft className="size-4" />
          কুপন লিস্টে ফিরুন
        </Link>
      </Button>
      <h1 className="mb-6 text-2xl font-bold">
        কুপন এডিট — <span className="font-mono">{coupon.code}</span>
      </h1>
      <CouponForm
        couponId={coupon.id}
        defaults={{
          code: coupon.code,
          type: coupon.type,
          value: coupon.value.toString(),
          minOrderAmount: coupon.minOrderAmount ? coupon.minOrderAmount.toString() : "",
          maxUses: coupon.maxUses ? String(coupon.maxUses) : "",
          startsAt: toInput(coupon.startsAt),
          endsAt: toInput(coupon.endsAt),
          isActive: coupon.isActive,
        }}
      />
    </div>
  );
}
