import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Store, History } from "lucide-react";
import { auth } from "@/auth";
import { getOrderById } from "@/lib/data";
import { formatBDT, formatDate } from "@/lib/format";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/order-status";
import { OrderStatusTimeline } from "@/components/orders/order-status-timeline";
import { CancelOrderButton } from "@/components/orders/cancel-order-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "অ্যাডমিন",
  SELLER: "সেলার",
  CUSTOMER: "কাস্টমার",
  SYSTEM: "সিস্টেম",
};

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "DELIVERED"
      ? "bg-emerald-100 text-emerald-700"
      : status === "CANCELLED"
        ? "bg-destructive/10 text-destructive"
        : status === "RETURNED" || status === "REFUNDED"
          ? "bg-amber-100 text-amber-700"
          : "bg-primary/10 text-primary";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
    </span>
  );
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const { placed } = await searchParams;
  const order = await getOrderById(session.user.id, id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {placed === "1" && (
        <div className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          অর্ডার সফলভাবে সম্পন্ন হয়েছে! অর্ডার নম্বর: {order.orderNumber}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">অর্ডার {order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            অর্ডারের সময়: {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <Link href="/account/orders" className="text-sm text-navy hover:underline">
            ← সব অর্ডার
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Parent tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">অর্ডার স্ট্যাটাস</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderStatusTimeline status={order.status} />
              {["PENDING", "CONFIRMED"].includes(order.status) && (
                <div className="mt-4">
                  <CancelOrderButton orderId={order.id} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sub-orders per seller */}
          {order.subOrders.map((sub, idx) => (
            <Card key={sub.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Store className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base">
                    {sub.seller?.shop?.name ?? "TemoBay"}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    (সাব-অর্ডার #{idx + 1} · {sub.orderNumber})
                  </span>
                </div>
                <StatusBadge status={sub.status} />
              </CardHeader>
              <CardContent className="space-y-4">
                <OrderStatusTimeline status={sub.status} />

                {sub.shipment?.trackingCode && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <span className="font-medium">ট্র্যাকিং কোড:</span>{" "}
                    <span className="font-mono">{sub.shipment.trackingCode}</span>
                    {sub.shipment.partner && (
                      <>
                        {" • কুরিয়ার: "}
                        <span className="font-medium">{sub.shipment.partner}</span>
                      </>
                    )}
                  </div>
                )}

                <Separator />

                {sub.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="block size-16 shrink-0 overflow-hidden rounded-lg border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.product.images[0]?.url ?? "/placeholder.svg"}
                        alt=""
                        className="size-full object-cover"
                      />
                    </Link>
                    <div className="flex-1">
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="line-clamp-2 text-sm font-medium hover:text-primary"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {item.variantName && <span className="mr-2">{item.variantName}</span>}
                        {formatBDT(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatBDT(Number(item.price) * item.quantity)}
                    </p>
                  </div>
                ))}

                {/* Status history */}
                <Separator />
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    <History className="size-3.5" /> স্ট্যাটাস হিস্টরি
                  </p>
                  <ol className="space-y-2">
                    {sub.statusHistory.map((h) => (
                      <li key={h.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {h.fromStatus
                            ? `${ORDER_STATUS_LABELS[h.fromStatus as OrderStatus] ?? h.fromStatus} → `
                            : ""}
                          <span className="font-medium text-foreground">
                            {ORDER_STATUS_LABELS[h.toStatus as OrderStatus] ?? h.toStatus}
                          </span>
                          <span className="ml-2">
                            ({ROLE_LABELS[h.changedByRole] ?? h.changedByRole}
                            {h.note ? ` — ${h.note}` : ""})
                          </span>
                        </span>
                        <span className="shrink-0 text-muted-foreground/70">
                          {formatDate(h.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ডেলিভারি ঠিকানা</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{order.shippingName}</p>
              <p className="text-muted-foreground">{order.shippingPhone}</p>
              <p className="mt-2 text-muted-foreground">{order.shippingAddress}</p>
              {order.note && (
                <p className="mt-2 rounded bg-muted/50 p-2 text-xs">
                  নোট: {order.note}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">পেমেন্ট সামারি</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">সাবটোটাল</span>
                <span>{formatBDT(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ডেলিভারি চার্জ</span>
                <span>
                  {formatBDT(order.shippingCharge)}{" "}
                  <span className="text-xs">
                    ({order.deliveryMethod === "EXPRESS" ? "এক্সপ্রেস" : "স্ট্যান্ডার্ড"})
                  </span>
                </span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>ডিসকাউন্ট {order.couponCode && `(${order.couponCode})`}</span>
                  <span>-{formatBDT(order.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>মোট</span>
                <span className="font-bold text-price">{formatBDT(order.total ?? 0)}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">পেমেন্ট পদ্ধতি</span>
                <Badge variant="secondary">{order.paymentMethod}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">পেমেন্ট স্ট্যাটাস</span>
                <Badge variant="secondary">{order.paymentStatus}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
