"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ShoppingCart, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuantitySelector } from "@/components/cart/quantity-selector";
import { formatBDT } from "@/lib/format";
import type { CartDrawerItem } from "@/lib/cart-view";

export const OPEN_CART_EVENT = "shopdesh:open-cart";

export function CartTrigger({ count, label }: { count: number; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative gap-2"
      aria-label={label}
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT))}
    >
      <ShoppingCart className="size-4" />
      <span className="hidden lg:inline">{label}</span>
      {count > 0 && (
        <Badge className="absolute -right-1 -top-1 size-5 justify-center rounded-full p-0 text-[10px]">
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Button>
  );
}

export function CartDrawer({ items }: { items: CartDrawerItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const openCart = () => setOpen(true);
    window.addEventListener(OPEN_CART_EVENT, openCart);
    return () => window.removeEventListener(OPEN_CART_EVENT, openCart);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b px-4 py-3.5">
          <SheetTitle className="flex items-center gap-2 text-base font-bold tracking-wide">
            <ShoppingCart className="size-5" />
            SHOPPING CART
          </SheetTitle>
          <SheetClose asChild>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Close
              <ArrowRight className="size-4" />
            </button>
          </SheetClose>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="relative">
              <ShoppingCart className="size-28 text-blue-500" strokeWidth={1.25} />
              <span className="absolute -right-1 top-1 flex size-9 items-center justify-center rounded-full bg-blue-500 text-white shadow">
                <X className="size-5" strokeWidth={2.5} />
              </span>
            </div>
            <p className="text-base font-medium">No items in your cart!</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 border-b px-4 py-3">
                  <Link
                    href={`/products/${item.slug}`}
                    className="block size-16 shrink-0 overflow-hidden rounded-lg border bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="size-full object-cover"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={`/products/${item.slug}`}
                      className="line-clamp-2 text-sm font-medium leading-5 hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm font-bold text-price">
                      {formatBDT(item.unitPrice)}
                      {item.originalPrice !== null && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground line-through">
                          {formatBDT(item.originalPrice)}
                        </span>
                      )}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <QuantitySelector
                        productId={item.productId}
                        quantity={item.quantity}
                        maxStock={item.stock}
                      />
                      <p className="text-sm font-bold">
                        {formatBDT(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">সাবটোটাল</span>
                <span className="text-base font-bold text-price">
                  {formatBDT(subtotal)}
                </span>
              </div>
              <Button asChild className="w-full">
                <Link href="/checkout">চেকআউট করুন</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/cart">কার্ট পেজে দেখুন</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
