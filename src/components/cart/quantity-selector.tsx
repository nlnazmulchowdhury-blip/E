"use client";

import { useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { updateCartQuantity, removeFromCart } from "@/lib/actions/cart";
import { Button } from "@/components/ui/button";

export function QuantitySelector({
  productId,
  quantity,
  maxStock,
}: {
  productId: string;
  quantity: number;
  maxStock: number;
}) {
  const [isPending, startTransition] = useTransition();

  function change(delta: number) {
    startTransition(async () => {
      await updateCartQuantity(productId, quantity + delta);
    });
  }

  function remove() {
    startTransition(async () => {
      await removeFromCart(productId);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => change(-1)}
        disabled={isPending}
        aria-label="কমান"
      >
        <Minus className="size-3" />
      </Button>
      <span className="w-8 text-center text-sm font-medium">{quantity}</span>
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => change(1)}
        disabled={isPending || quantity >= maxStock}
        aria-label="বাড়ান"
      >
        <Plus className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-destructive"
        onClick={remove}
        disabled={isPending}
        aria-label="মুছুন"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
