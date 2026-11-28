"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addToCart } from "@/lib/actions/cart";

export function AddToCartButton({
  productId,
  disabled = false,
  fullWidth = false,
  className,
  quantity = 1,
  buyNow = false,
  label = "কার্টে যোগ করুন",
  toastMessage = "কার্টে যোগ হয়েছে",
  buyNowLabel = "এখনই কিনুন",
  addedLabel = "যোগ হয়েছে",
  alreadyInCartMessage = "এই প্রোডাক্টটি আগে থেকেই কার্টে আছে",
  variant = "default",
}: {
  productId: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  quantity?: number;
  buyNow?: boolean;
  label?: string;
  toastMessage?: string;
  buyNowLabel?: string;
  addedLabel?: string;
  alreadyInCartMessage?: string;
  variant?: "default" | "outline" | "secondary";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    startTransition(async () => {
      try {
        const result = await addToCart(productId, quantity);
        if (buyNow) {
          router.push("/checkout");
          return;
        }
        // আগে থেকেই কার্টে থাকলে আরেকবার যোগ হয়নি — শুধু জানিয়ে দিই
        if (result?.alreadyInCart) {
          toast.info(alreadyInCartMessage);
          return;
        }
        setAdded(true);
        toast.success(toastMessage);
        setTimeout(() => setAdded(false), 1500);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "কিছু ভুল হয়েছে");
      }
    });
  }

  return (
    <Button
      onClick={handleAdd}
      disabled={disabled || isPending}
      className={cn(fullWidth && "w-full", className)}
      variant={buyNow || added ? (added && !buyNow ? "secondary" : "default") : variant}
    >
      {buyNow ? <Zap className="size-4" /> : <ShoppingCart className="size-4" />}
      {buyNow ? buyNowLabel : added ? addedLabel : label}
    </Button>
  );
}
