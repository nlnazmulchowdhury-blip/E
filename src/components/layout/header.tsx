import Link from "next/link";
import { Heart, User, Search, Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/auth";
import { getSession } from "@/lib/session";
import { getCart, getCategories, getUnreadNotificationCount } from "@/lib/data";
import { toCartDrawerItems } from "@/lib/cart-view";
import { Button } from "@/components/ui/button";
import { CartDrawer, CartTrigger } from "@/components/cart/cart-drawer";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

async function AccountMenu() {
  const session = await getSession();
  const t = await getTranslations("Header");

  if (!session?.user) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/login" className="gap-2">
          <User className="size-4" />
          {t("login")}
        </Link>
      </Button>
    );
  }

  const isAdmin = session.user.role === "ADMIN";
  const isSeller = session.user.role === "SELLER";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="size-4" />
          <span className="hidden md:inline max-w-28 truncate">{session.user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{session.user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/orders">{t("myOrders")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/notifications">{t("notifications")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/wishlist">{t("wishlist")}</Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">{t("adminPanel")}</Link>
          </DropdownMenuItem>
        )}
        {isSeller && (
          <DropdownMenuItem asChild>
            <Link href="/seller">{t("sellerPanel")}</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full cursor-pointer">
              {t("logout")}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export async function Header() {
  const session = await getSession();
  const userId = session?.user?.id;
  // হেডার প্রতিটি পেজে রেন্ডার হয় — তাই কুয়েরিগুলো একসাথে (parallel) চালাই,
  // নাহলে লগইন থাকা ইউজারের প্রতি পেজেই ৪টি কুয়েরি একটার পর একটা ঘোরে।
  const [cartItemRows, unreadNotifications, categories] = await Promise.all([
    userId ? getCart(userId) : Promise.resolve([] as Awaited<ReturnType<typeof getCart>>),
    userId ? getUnreadNotificationCount(userId) : Promise.resolve(0),
    getCategories(),
  ]);
  const cartItems = toCartDrawerItems(cartItemRows);
  // আলাদা কাউন্ট কুয়েরি না করে কার্ট আইটেন থেকেই হিসাব
  const cartCount = cartItemRows.reduce((sum, item) => sum + item.quantity, 0);
  const t = await getTranslations("Header");

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center" aria-label="TemoBay">
          <img
            src="/temobay-logo.png"
            alt="TemoBay"
            width={602}
            height={160}
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        <form action="/search" className="hidden flex-1 md:flex">
          <div className="relative w-full max-w-xl">
            <input
              type="search"
              name="q"
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-l-lg border border-input bg-white pl-4 pr-14 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              aria-label={t("search")}
              className="absolute right-0 top-0 flex h-10 w-12 cursor-pointer items-center justify-center rounded-r-lg bg-navy text-white transition-colors hover:bg-navy/90"
            >
              <Search className="size-5" />
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <LocaleSwitcher />
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href="/wishlist">
              <Heart className="size-4" />
              <span className="hidden lg:inline">{t("wishlist")}</span>
            </Link>
          </Button>
          <CartTrigger count={cartCount} label={t("cart")} />
          {session?.user?.id && (
            <Button asChild variant="ghost" size="sm" className="relative gap-2">
              <Link href="/account/notifications" aria-label={t("notifications")}>
                <Bell className="size-4" />
                <span className="hidden lg:inline">{t("notifications")}</span>
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
            </Button>
          )}
          <AccountMenu />
        </div>
      </div>

      <nav className="hidden border-t md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4">
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link href="/categories">{t("allCategories")}</Link>
          </Button>
          {categories.slice(0, 8).map((c) => (
            <Button asChild key={c.id} variant="ghost" size="sm" className="shrink-0">
              <Link href={`/categories/${c.slug}`}>{c.name}</Link>
            </Button>
          ))}
        </div>
      </nav>

      <CartDrawer items={cartItems} />
    </header>
  );
}
