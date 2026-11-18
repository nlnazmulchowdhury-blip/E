import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CouponForm } from "@/components/admin/coupon-form";
import { Button } from "@/components/ui/button";

export const metadata = { title: "নতুন কুপন" };

export default function NewCouponPage() {
  return (
    <div className="max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/admin/coupons">
          <ArrowLeft className="size-4" />
          কুপন লিস্টে ফিরুন
        </Link>
      </Button>
      <h1 className="mb-6 text-2xl font-bold">নতুন কুপন</h1>
      <CouponForm />
    </div>
  );
}
