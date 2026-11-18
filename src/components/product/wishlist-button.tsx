"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/lib/actions/wishlist";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  initialWishlisted,
  variant = "overlay",
  className,
}: {
  productId: string;
  initialWishlisted: boolean;
  variant?: "overlay" | "inline";
  className?: string;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      setWishlisted((w) => !w);
      try {
        await toggleWishlist(productId);
      } catch {
        setWishlisted((w) => !w);
      }
    });
  }

  const heart = (
    <Heart
      className={`size-4 ${wishlisted ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
    />
  );

  if (variant === "overlay") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute right-2 top-2 z-10 rounded-full bg-background/80 backdrop-blur",
          className
        )}
        onClick={handleToggle}
        disabled={isPending}
        aria-label="উইশলিস্টে যোগ করুন"
      >
        {heart}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("shrink-0", wishlisted && "border-red-200 bg-red-50")}
      onClick={handleToggle}
      disabled={isPending}
      aria-label="উইশলিস্টে যোগ করুন"
    >
      {heart}
    </Button>
  );
}
