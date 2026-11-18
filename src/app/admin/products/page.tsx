import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import Link from "next/link";
import { Plus } from "lucide-react";
import { approveProduct, rejectProduct, setProductStatus, deleteProduct } from "@/lib/actions/admin";
import { formatBDT } from "@/lib/format";
import { stockOf } from "@/lib/inventory";
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

export const metadata = { title: "প্রোডাক্ট ম্যানেজমেন্ট" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "অনুমোদন অপেক্ষায়",
  APPROVED: "অনুমোদিত",
  REJECTED: "বাতিল",
  INACTIVE: "নিষ্ক্রিয়",
};

export default async function AdminProductsPage() {
  await requireAdminOrStaff("products");
  const [pending, all] = await Promise.all([
    prisma.product.findMany({
      where: { status: "PENDING", deletedAt: null },
      include: { category: true, images: { orderBy: { position: "asc" } }, seller: { include: { shop: true } }, inventory: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      include: { category: true, images: { orderBy: { position: "asc" } }, seller: { include: { shop: true } }, inventory: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">প্রোডাক্ট ম্যানেজমেন্ট</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="size-4" />
            নতুন প্রোডাক্ট
          </Link>
        </Button>
      </div>

      <h2 className="mb-3 font-semibold">
        অনুমোদনের অপেক্ষায়{" "}
        <Badge variant={pending.length > 0 ? "destructive" : "secondary"}>
          {pending.length}
        </Badge>
      </h2>
      {pending.length === 0 ? (
        <p className="mb-8 rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          কোনো প্রোডাক্ট অনুমোদনের অপেক্ষায় নেই
        </p>
      ) : (
        <div className="mb-8 space-y-3">
          {pending.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.images[0]?.url ?? "/placeholder.svg"}
                alt=""
                className="size-14 rounded-md border object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.category.name} • {formatBDT(p.price)} • স্টক: {stockOf(p.inventory)}
                  {p.seller && ` • সেলার: ${p.seller.shop?.name ?? "-"}`}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={approveProduct.bind(null, p.id)}>
                  <Button type="submit" size="sm">
                    অনুমোদন
                  </Button>
                </form>
                <form action={rejectProduct.bind(null, p.id)}>
                  <Button type="submit" size="sm" variant="destructive">
                    বাতিল
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 font-semibold">সব প্রোডাক্ট</h2>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>প্রোডাক্ট</TableHead>
              <TableHead>ক্যাটাগরি</TableHead>
              <TableHead>দাম</TableHead>
              <TableHead>স্টক</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {all.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.images[0]?.url ?? "/placeholder.svg"}
                      alt=""
                      className="size-10 rounded-md border object-cover"
                    />
                    <span className="line-clamp-1 max-w-56 font-medium">{p.title}</span>
                  </div>
                </TableCell>
                <TableCell>{p.category.name}</TableCell>
                <TableCell>{formatBDT(p.price)}</TableCell>
                <TableCell>{stockOf(p.inventory)}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "APPROVED" ? "default" : "secondary"}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/products/${p.id}/edit`}>এডিট</Link>
                    </Button>
                    {p.status === "APPROVED" ? (
                      <form action={setProductStatus.bind(null, p.id, "INACTIVE")}>
                        <Button type="submit" size="sm" variant="outline">
                          নিষ্ক্রিয় করুন
                        </Button>
                      </form>
                    ) : p.status === "REJECTED" ? (
                      <form action={setProductStatus.bind(null, p.id, "APPROVED")}>
                        <Button type="submit" size="sm" variant="outline">
                          অনুমোদন দিন
                        </Button>
                      </form>
                    ) : (
                      <form action={setProductStatus.bind(null, p.id, "APPROVED")}>
                        <Button type="submit" size="sm" variant="outline">
                          সক্রিয় করুন
                        </Button>
                      </form>
                    )}
                    <form action={deleteProduct.bind(null, p.id)}>
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
