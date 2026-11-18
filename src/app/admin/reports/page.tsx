import { getReportsData } from "@/lib/reports";
import { requireAdminOrStaff } from "@/lib/permissions";
import { formatBDT } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
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

export const metadata = { title: "রিপোর্ট ও অ্যানালিটিক্স" };

const PAYMENT_LABELS: Record<string, string> = {
  COD: "ক্যাশ অন ডেলিভারি",
  BKASH: "বিকাশ",
  NAGAD: "নগদ",
  SSLCOMMERZ: "SSLCommerz",
  UNKNOWN: "—",
};

export default async function AdminReportsPage() {
  await requireAdminOrStaff("reports");
  const r = await getReportsData();

  const cards = [
    { label: "মোট অর্ডার", value: String(r.totalOrders) },
    { label: "মোট বিক্রি", value: formatBDT(r.totalSales) },
    { label: "ডেলিভারড আয়", value: formatBDT(r.deliveredRevenue) },
    { label: "মোট রিফান্ড", value: formatBDT(r.refundTotal) },
    { label: "কাস্টমার", value: String(r.userCount) },
    { label: "সেলার", value: String(r.sellerCount) },
    { label: "প্রোডাক্ট", value: String(r.productCount) },
    { label: "পেন্ডিং রিটার্ন", value: String(r.pendingReturnCount) },
  ];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">রিপোর্ট ও অ্যানালিটিক্স</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        বিক্রি, পেমেন্ট, টপ প্রোডাক্ট ও টপ সেলারের সারসংক্ষেপ
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-lg font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">পেমেন্ট পদ্ধতি</h2>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>পদ্ধতি</TableHead>
                  <TableHead>অর্ডার</TableHead>
                  <TableHead>পরিমাণ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.paymentBreakdown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      কোনো ডেটা নেই
                    </TableCell>
                  </TableRow>
                )}
                {r.paymentBreakdown.map((p) => (
                  <TableRow key={p.method}>
                    <TableCell>{PAYMENT_LABELS[p.method] ?? p.method}</TableCell>
                    <TableCell>{p.count}</TableCell>
                    <TableCell className="font-semibold">{formatBDT(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">অর্ডার স্ট্যাটাস</h2>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অর্ডার</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.statusBreakdown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                      কোনো ডেটা নেই
                    </TableCell>
                  </TableRow>
                )}
                {r.statusBreakdown.map((s) => (
                  <TableRow key={s.status}>
                    <TableCell>
                      {ORDER_STATUS_LABELS[s.status as keyof typeof ORDER_STATUS_LABELS] ??
                        s.status}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">টপ প্রোডাক্ট (বিক্রি সংখ্যায়)</h2>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>প্রোডাক্ট</TableHead>
                  <TableHead>বিক্রি</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.topProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                      কোনো ডেটা নেই
                    </TableCell>
                  </TableRow>
                )}
                {r.topProducts.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="text-sm">{p.title}</TableCell>
                    <TableCell className="font-semibold">{p.quantity}টি</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">টপ সেলার (বিক্রিতে)</h2>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>শপ</TableHead>
                  <TableHead>বিক্রি</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.topSellers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                      কোনো ডেটা নেই
                    </TableCell>
                  </TableRow>
                )}
                {r.topSellers.map((s) => (
                  <TableRow key={s.sellerId ?? "platform"}>
                    <TableCell className="text-sm">{s.shop}</TableCell>
                    <TableCell className="font-semibold">{formatBDT(s.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}
