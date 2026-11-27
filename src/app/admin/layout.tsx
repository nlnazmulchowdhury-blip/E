import Link from "next/link";
import { LayoutDashboard, FolderTree, Package, ShoppingBag, Users, Store, Banknote, Ticket, Percent, RotateCcw, History, BarChart3, Image, Images, Settings, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { type StaffPermission } from "@/lib/staff-permissions";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  perm?: StaffPermission;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "ড্যাশবোর্ড", icon: LayoutDashboard, exact: true },
  { href: "/admin/categories", label: "ক্যাটাগরি", icon: FolderTree, perm: "categories" },
  { href: "/admin/products", label: "প্রোডাক্ট", icon: Package, perm: "products" },
  { href: "/admin/orders", label: "অর্ডার", icon: ShoppingBag, perm: "orders" },
  { href: "/admin/returns", label: "রিটার্ন", icon: RotateCcw, perm: "returns" },
  { href: "/admin/sellers", label: "সেলার", icon: Store, perm: "sellers" },
  { href: "/admin/withdrawals", label: "উইথড্র", icon: Banknote, perm: "withdrawals" },
  { href: "/admin/commission", label: "কমিশন", icon: Percent, perm: "commission" },
  { href: "/admin/coupons", label: "কুপন", icon: Ticket, perm: "coupons" },
  { href: "/admin/customers", label: "কাস্টমার", icon: Users, perm: "customers" },
  { href: "/admin/banners", label: "ব্যানার", icon: Image, perm: "banners", exact: true },
  { href: "/admin/banners/all", label: "সব ব্যানার", icon: Images, perm: "banners" },
  { href: "/admin/settings", label: "সেটিংস", icon: Settings, perm: "settings" },
  { href: "/admin/staff", label: "স্টাফ", icon: ShieldCheck, adminOnly: true },
  { href: "/admin/audit-logs", label: "অডিট লগ", icon: History, adminOnly: true },
  { href: "/admin/reports", label: "রিপোর্ট", icon: BarChart3, perm: "reports" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/access-denied");

  const isStaff = session.user.role === "STAFF";
  const navItems = isStaff
    ? NAV_ITEMS.filter(
        (item) => !item.adminOnly && (!item.perm || hasPermission(session.user, item.perm))
      )
    : NAV_ITEMS;

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
      <aside className="hidden w-56 shrink-0 md:block">
        <nav className="sticky top-32 space-y-1">
          {navItems.map((item) => (
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
