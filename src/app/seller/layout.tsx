import Link from "next/link";
import { LayoutDashboard, Package, ShoppingBag, Wallet, Store } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const NAV_ITEMS = [
  { href: "/seller", label: "ড্যাশবোর্ড", icon: LayoutDashboard, exact: true },
  { href: "/seller/products", label: "প্রোডাক্ট", icon: Package },
  { href: "/seller/orders", label: "অর্ডার", icon: ShoppingBag },
  { href: "/seller/earnings", label: "আয় ও ব্যালেন্স", icon: Wallet },
  { href: "/seller/settings", label: "শপ সেটিংস", icon: Store },
];

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/access-denied");

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    include: { shop: true },
  });
  // SUSPENDED/REJECTED সেলার ভেতরে ঢুকতে পারবে না
  if (!profile || profile.status !== "APPROVED" || !profile.shop) {
    redirect("/access-denied");
  }

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="mb-4 flex items-center gap-3 rounded-xl border bg-card p-3">
          {profile.shop.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.shop.logoUrl} alt="" className="size-9 rounded-lg object-cover" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
              {profile.shop.name.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.shop.name}</p>
            <p className="text-xs text-muted-foreground">সেলার প্যানেল</p>
          </div>
        </div>
        <nav className="sticky top-32 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-primary/5 hover:text-foreground"
          >
            ← সাইটে ফিরুন
          </Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
