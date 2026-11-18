import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { suspendCustomer, reactivateCustomer } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export const metadata = { title: "কাস্টমার ম্যানেজমেন্ট" };

export default async function AdminCustomersPage() {
  await requireAdminOrStaff("customers");
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">কাস্টমার ম্যানেজমেন্ট</h1>
        <p className="text-sm text-muted-foreground">
          কাস্টমার অ্যাকাউন্ট স্থগিত বা পুনরায় চালু করুন — স্থগিত কাস্টমার লগইন, অ্যাকাউন্ট ও চেকআউট করতে পারবে না
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>নাম</TableHead>
              <TableHead>ইমেইল</TableHead>
              <TableHead>ফোন</TableHead>
              <TableHead>অর্ডার</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead>রেজিস্টার্ড</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{c._count.orders}টি</Badge>
                </TableCell>
                <TableCell>
                  {c.status === "SUSPENDED" ? (
                    <Badge variant="destructive">স্থগিত</Badge>
                  ) : (
                    <Badge variant="outline">সক্রিয়</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">{formatDate(c.createdAt)}</TableCell>
                <TableCell className="text-right">
                  {c.status === "SUSPENDED" ? (
                    <form action={reactivateCustomer.bind(null, c.id)}>
                      <Button type="submit" size="sm" variant="outline">
                        পুনরায় চালু
                      </Button>
                    </form>
                  ) : (
                    <form action={suspendCustomer.bind(null, c.id)}>
                      <Button type="submit" size="sm" variant="destructive">
                        স্থগিত করুন
                      </Button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
