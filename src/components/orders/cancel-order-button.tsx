"use client";

import { useTransition } from "react";
import { cancelOrder } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive"
      disabled={isPending}
      onClick={() => {
        if (confirm("আপনি কি নিশ্চিত অর্ডারটি বাতিল করতে চান?")) {
          startTransition(async () => {
            await cancelOrder(orderId);
          });
        }
      }}
    >
      {isPending ? "বাতিল হচ্ছে..." : "অর্ডার বাতিল করুন"}
    </Button>
  );
}
