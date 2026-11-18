"use client";

import { deleteSeller } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export default function SellerDeleteButton({
  sellerId,
  shopName,
}: {
  sellerId: string;
  shopName?: string | null;
}) {
  return (
    <form
      action={deleteSeller.bind(null, sellerId)}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `"${shopName ?? "এই সেলার"}" ডিলিট করবেন? অর্ডার ও আর্থিক রেকর্ড অক্ষত থাকবে — শুধু সেলার প্যানেল বন্ধ হবে।`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" size="sm" variant="destructive">
        ডিলিট
      </Button>
    </form>
  );
}
