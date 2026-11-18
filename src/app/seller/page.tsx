import Link from "next/link";
import { Package, PackageCheck, Clock, ShoppingBag, Wallet } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBDT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "সেলার ড্যাশবোর্ড" };

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "পেন্ডিং",
  CONFIRMED: "কনফার্মড",
  PROCESSING: "প্রসেসিং",
  PACKED: "প্যাকড",
  SHIPPED: "শিপড",
  DELIVERED: "ডেলিভারড",
  CANCELLED: "বাতিল",
  RETURNED: "রিটার্নড",
  REFUNDED: "রিফান্ডেড",
};

export default async function SellerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/access-denied");

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    include: { shop: true },
  });
  if (!profile || profile.status !== "APPROVED" || !profile.shop) {
    redirect("/access-denied");
  }

  const [productCount, pendingProducts, orderCount, deliveredRevenue, recentOrders] =
    await Promise.all([
      prisma.product.count({ where: { sellerId: profile.id, deletedAt: null } }),
      prisma.product.count({
        where: { sellerId: profile.id, deletedAt: null, status: "PENDING" },
      }),
      prisma.order.count({ where: { sellerId: profile.id } }),
      prisma.order.aggregate({
        _sum: { subtotal: true },
        where: { sellerId: profile.id, status: "DELIVERED" },
      }),
      prisma.order.findMany({
        where: { sellerId: profile.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const stats = [
    { label: "মোট প্রোডাক্ট", value: String(productCount), icon: Package },
    { label: "অনুমোদন অপেক্ষায়", value: String(pendingProducts), icon: Clock },
    { label: "মোট অর্ডার", value: String(orderCount), icon: ShoppingBag },
    {
      label: "মোট বিক্রি (ডেলিভারড)",
      value: formatBDT(deliveredRevenue._sum.subtotal ?? 0),
      icon: Wallet,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{profile.shop.name}</h1>
          <p className="text-sm text-muted-foreground">
            স্বাগতম, {session.user.name} — আপনার শপের সারসংক্ষেপ
          </p>
        </div>
        <Button asChild>
          <Link href="/seller/products/new">
            <Package className="size-4" />
            নতুন প্রোডাক্ট
          </Link>
        </Button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="size-4" />
              <span className="text-xs font-medium">{s.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-semibold">সাম্প্রতিক অর্ডার</h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/seller/orders">সব দেখুন</Link>
        </Button>
      </div>

      {recentOrders.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          এখনো কোনো অর্ডার আসেনি
        </p>
      ) : (
        <div className="space-y-3">
          {recentOrders.map((o) => (
            <Link
              key={o.id}
              href={`/seller/orders/${o.id}`}
              className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-primary/5"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{o.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium" }).format(o.createdAt)} •{" "}
                  {o.items.reduce((n, i) => n + i.quantity, 0)}টি আইটেম
                </p>
              </div>
              <Badge variant={o.status === "CANCELLED" ? "destructive" : "secondary"}>
                {ORDER_STATUS_LABELS[o.status] ?? o.status}
              </Badge>
              <span className="font-semibold">{formatBDT(o.total ?? o.subtotal)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
