import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { auth } from "@/auth";
import { getCart } from "@/lib/data";
import { formatBDT } from "@/lib/format";
import { stockOf } from "@/lib/inventory";
import { QuantitySelector } from "@/components/cart/quantity-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = { title: "কার্ট" };

export default async function CartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const items = await getCart(session.user.id);
  const subtotal = items.reduce((sum, item) => {
    const unitPrice =
      item.product.isFlashSale && item.product.flashSalePrice
        ? Number(item.product.flashSalePrice)
        : Number(item.product.price);
    return sum + unitPrice * item.quantity;
  }, 0);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-20 text-center">
        <ShoppingCart className="size-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">আপনার কার্ট খালি</h1>
        <p className="text-sm text-muted-foreground">
          পছন্দের প্রোডাক্ট কার্টে যোগ করে শপিং শুরু করুন
        </p>
        <Button asChild>
          <Link href="/categories">শপিং শুরু করুন</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">শপিং কার্ট</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((item) => {
            const price = Number(item.product.price);
            const flashPrice =
              item.product.isFlashSale && item.product.flashSalePrice
                ? Number(item.product.flashSalePrice)
                : null;
            const unitPrice = flashPrice ?? price;
            const stock = stockOf(item.product.inventory, item.variantId);
            return (
              <div
                key={item.id}
                className="flex gap-4 rounded-xl border bg-card p-4"
              >
                <Link
                  href={`/products/${item.product.slug}`}
                  className="block size-24 shrink-0 overflow-hidden rounded-lg bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.product.images[0]?.url ?? "/placeholder.svg"}
                    alt={item.product.title}
                    className="size-full object-cover"
                  />
                </Link>
                <div className="flex flex-1 flex-col justify-between gap-2">
                  <div>
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="line-clamp-2 text-sm font-medium hover:text-primary"
                    >
                      {item.product.title}
                    </Link>
                    <p className="mt-1 text-sm font-semibold text-price">
                      {formatBDT(unitPrice)}
                      {unitPrice !== price && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground line-through">
                          {formatBDT(price)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <QuantitySelector
                      productId={item.productId}
                      quantity={item.quantity}
                      maxStock={stock}
                    />
                    <p className="text-sm font-bold">
                      {formatBDT(unitPrice * item.quantity)}
                    </p>
                  </div>
                  {stock < item.quantity && (
                    <p className="text-xs text-destructive">
                      স্টকে মাত্র {stock}টি আছে
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <Card className="sticky top-32">
            <CardHeader>
              <CardTitle>অর্ডার সামারি</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">সাবটোটাল</span>
                <span className="font-medium">{formatBDT(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ডেলিভারি চার্জ</span>
                <span className="font-medium">চেকআউটে নির্ধারিত হবে</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-base">
                <span className="font-semibold">মোট</span>
                <span className="font-bold text-price">{formatBDT(subtotal)}</span>
              </div>
              <Button asChild size="lg" className="w-full">
                <Link href="/checkout">চেকআউট করুন</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/categories">আরও শপিং করুন</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
