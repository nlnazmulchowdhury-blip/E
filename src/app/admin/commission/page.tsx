import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import { formatBDT } from "@/lib/format";
import { getDefaultCommissionRate } from "@/lib/site-settings";
import {
  DefaultCommissionForm,
  SellerRateForm,
} from "@/components/admin/commission-forms";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export const metadata = { title: "কমিশন নিয়ন্ত্রণ" };

export default async function AdminCommissionPage() {
  await requireAdminOrStaff("commission");
  const [defaultRate, sellers] = await Promise.all([
    getDefaultCommissionRate(),
    prisma.sellerProfile.findMany({
      where: { deletedAt: null },
      include: { shop: true },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">কমিশন ও পেআউট নিয়ন্ত্রণ</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        প্ল্যাটফর্মের কমিশন হার — গ্লোবাল ডিফল্ট ও প্রতি-সেলার হার আলাদা করা যায়
      </p>

      <div className="mb-8 rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">ডিফল্ট কমিশন হার</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          নতুন অনুমোদিত সেলার এই হার নিয়ে শুরু করে। আগের সেলারদের হার অপরিবর্তিত থাকে।
        </p>
        <DefaultCommissionForm currentRate={defaultRate} />
      </div>

      <h2 className="mb-3 font-semibold">সেলারভিত্তিক কমিশন হার</h2>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>শপ</TableHead>
              <TableHead>বর্তমান হার</TableHead>
              <TableHead>ব্যালেন্স</TableHead>
              <TableHead>নতুন হার</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  কোনো সেলার নেই
                </TableCell>
              </TableRow>
            )}
            {sellers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.shop?.name ?? "—"}</TableCell>
                <TableCell>{Number(s.commissionRate)}%</TableCell>
                <TableCell>{formatBDT(s.balance)}</TableCell>
                <TableCell>
                  <SellerRateForm
                    sellerId={s.id}
                    currentRate={Number(s.commissionRate)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
