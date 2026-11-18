import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBDT } from "@/lib/format";
import { ORDER_STATUS_LABELS, ALLOWED_TRANSITIONS, TRANSITION_LABELS } from "@/lib/order-status";
import { updateOrderStatus } from "@/lib/actions/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "আমার অর্ডার" };

const STATUS_BADGES: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  PROCESSING: "default",
  PACKED: "default",
  SHIPPED: "default",
  DELIVERED: "outline",
  CANCELLED: "destructive",
  RETURNED: "destructive",
  REFUNDED: "destructive",
};

export default async function SellerOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/access-denied");

  const profile = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile || profile.status !== "APPROVED") redirect("/access-denied");

  const orders = await prisma.order.findMany({
    where: { sellerId: profile.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">আমার অর্ডার</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        আপনার শপের প্রোডাক্টের অর্ডারগুলো — স্ট্যাটাস বাটনে ক্লিক করে সরাসরি আপডেট করুন, বিস্তারিত ডিটেইলে দেখুন
      </p>

      {orders.length === 0 ? (
        <p className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          এখনো কোনো অর্ডার আসেনি
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">অর্ডার নম্বর</th>
                <th className="px-4 py-3 font-medium">তারিখ</th>
                <th className="px-4 py-3 font-medium">আইটেম</th>
                <th className="px-4 py-3 font-medium">মোট</th>
                <th className="px-4 py-3 font-medium">স্ট্যাটাস</th>
                <th className="px-4 py-3 text-right font-medium">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const nextStatuses = ALLOWED_TRANSITIONS[o.status] ?? [];
                return (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium" }).format(o.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {o.items.reduce((n, i) => n + i.quantity, 0)}টি
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatBDT(o.total ?? o.subtotal)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGES[o.status] ?? "secondary"}>
                        {ORDER_STATUS_LABELS[o.status as keyof typeof ORDER_STATUS_LABELS] ?? o.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {nextStatuses.map((status) => (
                          <form key={status} action={updateOrderStatus.bind(null, o.id, status)}>
                            <Button
                              type="submit"
                              size="sm"
                              variant={
                                status === "CANCELLED" || status === "RETURNED"
                                  ? "destructive"
                                  : status === "CONFIRMED" || status === "DELIVERED"
                                    ? "default"
                                    : "outline"
                              }
                            >
                              {TRANSITION_LABELS[status] ?? status}
                            </Button>
                          </form>
                        ))}
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/seller/orders/${o.id}`}>ডিটেইল</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
