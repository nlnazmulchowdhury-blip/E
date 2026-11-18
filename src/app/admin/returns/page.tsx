import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import { formatBDT, formatDate } from "@/lib/format";
import { ReturnDecisionForm } from "@/components/admin/return-decision-form";
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

export const metadata = { title: "রিটার্ন ও রিফান্ড" };

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "অনুরোধ করা হয়েছে",
  APPROVED: "অনুমোদিত",
  REJECTED: "বাতিল",
  REFUNDED: "রিফান্ডেড",
};

const include = {
  order: { select: { orderNumber: true, status: true } },
  orderItem: { select: { title: true, price: true, quantity: true } },
  user: { select: { name: true, email: true } },
} as const;

export default async function AdminReturnsPage() {
  await requireAdminOrStaff("returns");
  const [requested, all] = await Promise.all([
    prisma.returnRequest.findMany({
      where: { status: "REQUESTED" },
      include,
      orderBy: { createdAt: "asc" },
    }),
    prisma.returnRequest.findMany({
      include,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">রিটার্ন ও রিফান্ড</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        কাস্টমারদের রিটার্ন রিকোয়েস্ট অনুমোদন বা বাতিল করুন
      </p>

      <h2 className="mb-3 font-semibold">
        নতুন রিকোয়েস্ট{" "}
        <Badge variant={requested.length > 0 ? "destructive" : "secondary"}>
          {requested.length}
        </Badge>
      </h2>
      {requested.length === 0 ? (
        <p className="mb-8 rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          কোনো পেন্ডিং রিটার্ন রিকোয়েস্ট নেই
        </p>
      ) : (
        <div className="mb-8 space-y-3">
          {requested.map((r) => {
            const itemTotal = Number(r.orderItem.price) * r.orderItem.quantity;
            return (
              <div key={r.id} className="rounded-xl border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {r.orderItem.title} ×{r.orderItem.quantity}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({formatBDT(itemTotal)})
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.user.name} ({r.user.email}) • অর্ডার{" "}
                      <span className="font-mono">{r.order.orderNumber}</span> •{" "}
                      {formatDate(r.createdAt)}
                    </p>
                    <p className="mt-1 text-sm">
                      কারণ: {r.reason}
                      {r.details && (
                        <span className="text-muted-foreground"> — {r.details}</span>
                      )}
                    </p>
                  </div>
                  <Badge variant="outline">{r.order.status}</Badge>
                </div>
                <ReturnDecisionForm requestId={r.id} decision="APPROVED" itemTotal={itemTotal} />
                <div className="mt-2">
                  <ReturnDecisionForm requestId={r.id} decision="REJECTED" itemTotal={itemTotal} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 font-semibold">সব রিকোয়েস্ট</h2>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>প্রোডাক্ট</TableHead>
              <TableHead>কাস্টমার</TableHead>
              <TableHead>অর্ডার</TableHead>
              <TableHead>কারণ</TableHead>
              <TableHead>রিফান্ড</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead>তারিখ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {all.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  কোনো রিটার্ন রিকোয়েস্ট নেই
                </TableCell>
              </TableRow>
            )}
            {all.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">
                  {r.orderItem.title} ×{r.orderItem.quantity}
                </TableCell>
                <TableCell className="text-xs">{r.user.name}</TableCell>
                <TableCell className="font-mono text-xs">{r.order.orderNumber}</TableCell>
                <TableCell className="text-xs">{r.reason}</TableCell>
                <TableCell className="font-semibold">
                  {r.refundAmount ? formatBDT(r.refundAmount) : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      r.status === "REFUNDED"
                        ? "default"
                        : r.status === "REJECTED"
                          ? "destructive"
                          : r.status === "APPROVED"
                            ? "secondary"
                            : "outline"
                    }
                  >
                    {STATUS_LABELS[r.status] ?? r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
