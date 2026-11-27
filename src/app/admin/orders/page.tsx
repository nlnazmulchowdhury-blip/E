import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import { formatBDT, formatDate } from "@/lib/format";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/order-status";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { ShipmentEditor } from "@/components/admin/shipment-editor";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export const metadata = { title: "অর্ডার ম্যানেজমেন্ট" };

export default async function AdminOrdersPage() {
  await requireAdminOrStaff("orders");
  const parents = await prisma.order.findMany({
    where: { parentId: null },
    include: {
      user: { select: { name: true, email: true } },
      subOrders: {
        include: {
          seller: { include: { shop: true } },
          items: { select: { title: true, quantity: true } },
          shipment: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">অর্ডার ম্যানেজমেন্ট</h1>
      <div className="space-y-6">
        {parents.map((parent) => (
          <div key={parent.id} className="overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
              <div>
                <p className="font-mono text-sm font-semibold">{parent.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {parent.user.name} ({parent.user.email}) • {formatDate(parent.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold">{formatBDT(parent.total ?? 0)}</span>
                <Badge variant="secondary">{parent.paymentMethod}</Badge>
                <Badge variant="secondary">{parent.paymentStatus}</Badge>
                <Badge variant="outline">
                  {ORDER_STATUS_LABELS[parent.status as OrderStatus] ?? parent.status}
                </Badge>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>সাব-অর্ডার</TableHead>
                  <TableHead>সেলার</TableHead>
                  <TableHead>প্রোডাক্ট</TableHead>
                  <TableHead>সাবটোটাল</TableHead>
                  <TableHead>শিপমেন্ট</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parent.subOrders.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-mono text-xs">{sub.orderNumber}</TableCell>
                    <TableCell className="text-sm">
                      {sub.seller?.shop?.name ?? "TemoBay (প্ল্যাটফর্ম)"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.items.map((i) => `${i.title} ×${i.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatBDT(sub.subtotal)}
                      {Number(sub.discount) > 0 && (
                        <span className="ml-1 text-xs font-normal text-emerald-600">
                          -{formatBDT(sub.discount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {sub.shipment ? (
                        <ShipmentEditor
                          orderId={sub.id}
                          partner={sub.shipment.partner}
                          trackingCode={sub.shipment.trackingCode}
                          status={sub.shipment.status}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <OrderStatusSelect orderId={sub.id} currentStatus={sub.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    </div>
  );
}
