import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck, User as UserIcon, Phone } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBDT, formatDate } from "@/lib/format";
import { ORDER_STATUS_LABELS, ALLOWED_TRANSITIONS, TRANSITION_LABELS, type OrderStatus } from "@/lib/order-status";
import { updateOrderStatus } from "@/lib/actions/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "অর্ডার ডিটেইল" };

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/access-denied");

  const profile = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile || profile.status !== "APPROVED") redirect("/access-denied");

  // Ownership চেক: শুধু নিজের সাব-অর্ডার দেখা যাবে
  const order = await prisma.order.findUnique({
    where: { id, sellerId: profile.id },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order || !order.parentId) notFound();

  const nextStatuses = ALLOWED_TRANSITIONS[order.status] ?? [];
  const paymentMethodLabel: Record<string, string> = {
    COD: "ক্যাশ অন ডেলিভারি",
    BKASH: "বিকাশ",
    NAGAD: "নগদ",
    SSLCOMMERZ: "কার্ড/অনলাইন",
  };

  return (
    <div className="max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/seller/orders">
          <ArrowLeft className="size-4" />
          অর্ডার লিস্টে ফিরুন
        </Link>
      </Button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
        </div>
        <Badge variant={order.status === "CANCELLED" ? "destructive" : "default"}>
          {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
        </Badge>
      </div>

      {/* আইটেম তালিকা */}
      <div className="mb-6 rounded-xl border bg-card">
        <div className="border-b p-4 text-sm font-semibold">আইটেম</div>
        <div className="divide-y">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBDT(item.price)} × {item.quantity}
                </p>
              </div>
              <span className="font-semibold">{formatBDT(item.price.mul(item.quantity))}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t p-4">
          <span className="text-sm text-muted-foreground">সাব-অর্ডার মোট</span>
          <span className="text-lg font-bold">{formatBDT(order.total ?? order.subtotal)}</span>
        </div>
      </div>

      {/* ডেলিভারি তথ্য */}
      <div className="mb-6 rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Truck className="size-4" />
          ডেলিভারি তথ্য
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <p className="flex items-center gap-2">
            <UserIcon className="size-4 text-muted-foreground" />
            {order.shippingName ?? "—"}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="size-4 text-muted-foreground" />
            {order.shippingPhone ?? "—"}
          </p>
          <p className="sm:col-span-3 text-muted-foreground">{order.shippingAddress}</p>
          <p className="sm:col-span-3 text-xs text-muted-foreground">
            পেমেন্ট: {paymentMethodLabel[order.paymentMethod ?? ""] ?? "—"} • ডেলিভারি:{" "}
            {order.deliveryMethod === "EXPRESS" ? "এক্সপ্রেস" : "স্ট্যান্ডার্ড"}
            {order.note && ` • নোট: ${order.note}`}
          </p>
        </div>
      </div>

      {/* স্ট্যাটাস আপডেট */}
      {nextStatuses.length > 0 && (
        <div className="mb-6 rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">স্ট্যাটাস আপডেট করুন</p>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <form key={status} action={updateOrderStatus.bind(null, order.id, status)}>
                <Button
                  type="submit"
                  size="sm"
                  variant={status === "CANCELLED" ? "destructive" : "default"}
                >
                  {TRANSITION_LABELS[status] ?? status}
                </Button>
              </form>
            ))}
          </div>
        </div>
      )}

      {/* স্ট্যাটাস হিস্ট্রি */}
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4 text-sm font-semibold">স্ট্যাটাস হিস্ট্রি</div>
        <div className="divide-y">
          {order.statusHistory.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">কোনো হিস্ট্রি নেই</p>
          )}
          {order.statusHistory.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p>
                  {h.fromStatus ? (
                    <>
                      <span className="text-muted-foreground">
                        {ORDER_STATUS_LABELS[h.fromStatus as OrderStatus] ?? h.fromStatus}
                      </span>
                      {" → "}
                    </>
                  ) : null}
                  <span className="font-medium">
                    {ORDER_STATUS_LABELS[h.toStatus as OrderStatus] ?? h.toStatus}
                  </span>
                </p>
                {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
