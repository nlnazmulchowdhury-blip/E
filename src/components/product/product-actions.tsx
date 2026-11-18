"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";

export function ProductActions({
  productId,
  outOfStock,
  stock,
  initialWishlisted,
}: {
  productId: string;
  outOfStock: boolean;
  stock: number;
  initialWishlisted: boolean;
}) {
  const t = useTranslations("Common");
  const [qty, setQty] = useState(1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{t("quantity")}</span>
          <QuantitySelector value={qty} onChange={setQty} max={Math.max(1, stock)} />
        </div>
        <WishlistButton
          productId={productId}
          variant="inline"
          initialWishlisted={initialWishlisted}
        />
      </div>
      <div className="flex gap-3">
        <AddToCartButton
          productId={productId}
          disabled={outOfStock}
          fullWidth
          quantity={qty}
          variant="outline"
          label={t("addToCart")}
          toastMessage={t("addedToCart")}
          className="h-10 flex-1 border-primary bg-white text-base font-semibold text-primary hover:bg-primary/5 md:h-11"
        />
        <AddToCartButton
          productId={productId}
          disabled={outOfStock}
          fullWidth
          quantity={qty}
          buyNow
          buyNowLabel={t("buyNow")}
          className="h-10 flex-1 bg-brand text-base font-semibold text-[#111827] hover:bg-brand/90 md:h-11"
        />
      </div>
    </div>
  );
}
