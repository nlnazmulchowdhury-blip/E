import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { auth } from "@/auth";
import { getOrders } from "@/lib/data";
import { formatBDT, formatDate } from "@/lib/format";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/order-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "আমার অর্ডার" };

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "secondary",
  PROCESSING: "secondary",
  PACKED: "secondary",
  SHIPPED: "default",
  DELIVERED: "default",
  CANCELLED: "outline",
  RETURNED: "outline",
  REFUNDED: "outline",
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orders = await getOrders(session.user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">আমার অর্ডার</h1>
      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-20 text-center">
          <PackageOpen className="size-16 text-muted-foreground" />
          <p className="text-muted-foreground">আপনার এখনো কোনো অর্ডার নেই</p>
          <Button asChild>
            <Link href="/categories">শপিং শুরু করুন</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const items = order.subOrders.flatMap((sub) => sub.items);
            const shopCount = order.subOrders.length;
            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[order.status] ?? "secondary"}>
                    {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {items.slice(0, 4).map((item) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={item.id}
                        src={item.product.images[0]?.url ?? "/placeholder.svg"}
                        alt=""
                        className="size-12 rounded-md border-2 border-background object-cover"
                      />
                    ))}
                  </div>
                  <div className="flex-1 text-sm text-muted-foreground">
                    <p>
                      {items.length}টি প্রোডাক্ট • {shopCount}টি সেলার •{" "}
                      {order.paymentMethod} পেমেন্ট
                    </p>
                    <p className="font-semibold text-foreground">
                      {formatBDT(order.total ?? 0)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
