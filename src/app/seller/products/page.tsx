import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteSellerProduct } from "@/lib/actions/seller";
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

export const metadata = { title: "আমার প্রোডাক্ট" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "অনুমোদন অপেক্ষায়",
  APPROVED: "অনুমোদিত",
  REJECTED: "বাতিল",
  INACTIVE: "নিষ্ক্রিয়",
};

export default async function SellerProductsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/access-denied");

  const profile = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile || profile.status !== "APPROVED") redirect("/access-denied");

  const products = await prisma.product.findMany({
    where: { sellerId: profile.id, deletedAt: null },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      inventory: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">আমার প্রোডাক্ট</h1>
          <p className="text-sm text-muted-foreground">
            নতুন প্রোডাক্ট অ্যাডমিন অনুমোদনের পর সাইটে দেখাবে
          </p>
        </div>
        <Button asChild>
          <Link href="/seller/products/new">
            <Plus className="size-4" />
            নতুন প্রোডাক্ট
          </Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-muted-foreground">এখনো কোনো প্রোডাক্ট যোগ করেননি</p>
          <Button asChild className="mt-4">
            <Link href="/seller/products/new">
              <Plus className="size-4" />
              প্রথম প্রোডাক্ট যোগ করুন
            </Link>
          </Button>
        </div>
      ) : (
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
              {products.map((p) => (
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
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/seller/products/${p.id}/edit`}>এডিট</Link>
                      </Button>
                      <form action={deleteSellerProduct.bind(null, p.id)}>
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
      )}
    </div>
  );
}
