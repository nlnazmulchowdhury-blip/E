"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Search, ShoppingCart, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NavCategory = { id: string; name: string; slug: string };

export function MobileNavBar({
  cartCount,
  categories,
  accountHref,
}: {
  cartCount: number;
  categories: NavCategory[];
  accountHref: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = (active: boolean) =>
    cn(
      "relative flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium text-white transition-colors",
      active ? "bg-white/20" : "hover:bg-white/10"
    );

  return (
    <>
      {menuOpen && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-50 px-3 md:hidden">
          <div className="mx-auto max-w-md rounded-xl border bg-background p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">ক্যাটাগরি</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="মেনু বন্ধ করুন"
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/categories/${c.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm hover:bg-muted"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 bg-primary pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="মোবাইল নেভিগেশন"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 px-1 py-1">
          <Link href="/" className={linkClass(pathname === "/")}>
            <Home className="size-5" />
            হোম
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(linkClass(menuOpen), "cursor-pointer")}
          >
            <LayoutGrid className="size-5" />
            মেনু
          </button>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("shopdesh:open-cart"))
            }
            className={cn(linkClass(false), "cursor-pointer")}
          >
            <span className="relative">
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-4 text-primary">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </span>
            কার্ট
          </button>
          <Link
            href="/search"
            className={linkClass(pathname.startsWith("/search"))}
          >
            <Search className="size-5" />
            সার্চ
          </Link>
          <Link
            href={accountHref}
            className={linkClass(pathname.startsWith("/account"))}
          >
            <User className="size-5" />
            অ্যাকাউন্ট
          </Link>
        </div>
      </nav>
    </>
  );
}
