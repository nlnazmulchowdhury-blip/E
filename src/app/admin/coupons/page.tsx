import Link from "next/link";
import { Plus, Ticket } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import { deleteCoupon, toggleCoupon } from "@/lib/actions/admin";
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

export const metadata = { title: "কুপন ম্যানেজমেন্ট" };

export default async function AdminCouponsPage() {
  await requireAdminOrStaff("coupons");
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">কুপন ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted-foreground">
            ডিসকাউন্ট কুপন তৈরি, এডিট ও নিয়ন্ত্রণ করুন
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/coupons/new">
            <Plus className="size-4" />
            নতুন কুপন
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>কোড</TableHead>
              <TableHead>ছাড়</TableHead>
              <TableHead>সর্বনিম্ন অর্ডার</TableHead>
              <TableHead>ব্যবহার</TableHead>
              <TableHead>মেয়াদ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  <Ticket className="mx-auto mb-2 size-8 opacity-40" />
                  কোনো কুপন নেই — প্রথম কুপন তৈরি করুন
                </TableCell>
              </TableRow>
            )}
            {coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                <TableCell>
                  {c.type === "PERCENT" ? `${c.value}%` : formatBDT(c.value)}
                </TableCell>
                <TableCell>
                  {c.minOrderAmount ? formatBDT(c.minOrderAmount) : "—"}
                </TableCell>
                <TableCell>
                  {c.usedCount}
                  {c.maxUses ? `/${c.maxUses}` : ""}
                </TableCell>
                <TableCell className="text-xs">
                  {c.startsAt || c.endsAt ? (
                    <>
                      {c.startsAt ? formatDate(c.startsAt) : "—"} →{" "}
                      {c.endsAt ? formatDate(c.endsAt) : "—"}
                    </>
                  ) : (
                    "সীমাহীন"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "default" : "secondary"}>
                    {c.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/coupons/${c.id}/edit`}>এডিট</Link>
                    </Button>
                    <form action={toggleCoupon.bind(null, c.id)}>
                      <Button type="submit" size="sm" variant="secondary">
                        {c.isActive ? "বন্ধ করুন" : "চালু করুন"}
                      </Button>
                    </form>
                    <form action={deleteCoupon.bind(null, c.id)}>
                      <Button type="submit" size="sm" variant="destructive">
                        ডিলিট
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
