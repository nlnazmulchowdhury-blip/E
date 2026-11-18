import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import { approveWithdrawal, rejectWithdrawal } from "@/lib/actions/admin";
import { formatBDT, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
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

export const metadata = { title: "উইথড্র ম্যানেজমেন্ট" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "অনুমোদন অপেক্ষায়",
  PAID: "পরিশোধিত",
  REJECTED: "বাতিল",
};

const METHOD_LABELS: Record<string, string> = {
  BKASH: "বিকাশ",
  BANK: "ব্যাংক",
};

export default async function AdminWithdrawalsPage() {
  await requireAdminOrStaff("withdrawals");
  const [pending, all] = await Promise.all([
    prisma.withdrawal.findMany({
      where: { status: "PENDING" },
      include: { seller: { include: { shop: true } } },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.withdrawal.findMany({
      include: { seller: { include: { shop: true } } },
      orderBy: { requestedAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">উইথড্র ম্যানেজমেন্ট</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        সেলারদের টাকা তোলার রিকোয়েস্ট অনুমোদন বা বাতিল করুন
      </p>

      <h2 className="mb-3 font-semibold">
        অনুমোদনের অপেক্ষায়{" "}
        <Badge variant={pending.length > 0 ? "destructive" : "secondary"}>
          {pending.length}
        </Badge>
      </h2>
      {pending.length === 0 ? (
        <p className="mb-8 rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          কোনো পেন্ডিং রিকোয়েস্ট নেই
        </p>
      ) : (
        <div className="mb-8 space-y-3">
          {pending.map((w) => (
            <div
              key={w.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{formatBDT(w.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {w.seller.shop?.name ?? "—"} • {METHOD_LABELS[w.method] ?? w.method}
                  {w.method === "BKASH"
                    ? ` (${w.seller.bkashNumber ?? "নম্বর নেই"})`
                    : w.method === "BANK"
                      ? ` (${w.seller.bankName ?? ""} ${w.seller.bankAccountNo ?? ""})`
                      : ""}{" "}
                  • {formatDate(w.requestedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={approveWithdrawal.bind(null, w.id)}>
                  <Button type="submit" size="sm">
                    অনুমোদন ও পেআউট
                  </Button>
                </form>
                <form action={rejectWithdrawal.bind(null, w.id)}>
                  <Button type="submit" size="sm" variant="destructive">
                    বাতিল
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 font-semibold">সব রিকোয়েস্ট</h2>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>শপ</TableHead>
              <TableHead>পরিমাণ</TableHead>
              <TableHead>পদ্ধতি</TableHead>
              <TableHead>তারিখ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {all.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  কোনো রিকোয়েস্ট নেই
                </TableCell>
              </TableRow>
            )}
            {all.map((w) => (
              <TableRow key={w.id}>
                <TableCell>{w.seller.shop?.name ?? "—"}</TableCell>
                <TableCell className="font-semibold">{formatBDT(w.amount)}</TableCell>
                <TableCell>{METHOD_LABELS[w.method] ?? w.method}</TableCell>
                <TableCell>{formatDate(w.requestedAt)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      w.status === "PAID"
                        ? "default"
                        : w.status === "REJECTED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {STATUS_LABELS[w.status] ?? w.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
