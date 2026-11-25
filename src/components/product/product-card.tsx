import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { getWishlistedProductIds } from "@/lib/data";
import { formatBDT } from "@/lib/format";
import { stockOf, type InventoryRow } from "@/lib/inventory";
import { WishlistButton } from "@/components/product/wishlist-button";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { Badge } from "@/components/ui/badge";

type ProductCardData = {
  id: string;
  title: string;
  slug: string;
  price: unknown;
  compareAtPrice?: unknown | null;
  inventory: InventoryRow[];
  isFlashSale: boolean;
  flashSalePrice?: unknown | null;
  ratingAvg: number;
  ratingCount: number;
  images: { url: string; alt?: string | null }[];
};

export async function ProductCard({ product }: { product: ProductCardData }) {
  const t = await getTranslations("Common");
  const session = await getSession();
  const userId = session?.user?.id;

  // পেজে যত কার্ডই থাকুক, উইশলিস্ট একবারই কুয়েরি হয় (ক্যাশড)
  const wishlisted = userId
    ? (await getWishlistedProductIds(userId)).has(product.id)
    : false;

  const price = Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const flashPrice = product.isFlashSale ? Number(product.flashSalePrice) : null;
  const displayPrice = flashPrice ?? price;
  const stock = stockOf(product.inventory);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Link href={`/products/${product.slug}`} className="block size-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.images[0]?.url ?? "/placeholder.svg"}
            alt={product.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
        <WishlistButton
          productId={product.id}
          initialWishlisted={!!wishlisted}
          className="opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        />
        {stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Badge variant="secondary">{t("outOfStock")}</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 text-sm font-medium leading-6 hover:text-primary"
        >
          {product.title}
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xl font-extrabold leading-none tracking-tight text-price">
            {formatBDT(displayPrice)}
          </span>
          {compareAt && compareAt > displayPrice && (
            <>
              <span className="text-sm text-muted-foreground line-through">
                {formatBDT(compareAt)}
              </span>
              {displayPrice > 0 && (
                <span className="text-xs font-semibold text-price">
                  {t("savePercent", {
                    percent: Math.round((1 - displayPrice / compareAt) * 100),
                  })}
                </span>
              )}
            </>
          )}
        </div>
        <div className="mt-auto pt-1">
          <AddToCartButton
            productId={product.id}
            disabled={stock === 0}
            fullWidth
            variant="outline"
            label={t("addToCart")}
            toastMessage={t("addedToCart")}
            className="h-10 font-semibold border-primary bg-white text-primary hover:bg-primary/5"
          />
        </div>
      </div>
    </div>
  );
}
