import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import {
  approveSeller,
  suspendSeller,
  reactivateSeller,
} from "@/lib/actions/admin";
import SellerDeleteButton from "@/components/admin/seller-delete-button";
import SellerRejectButton from "@/components/admin/seller-reject-button";
import SellerDetailButton from "@/components/admin/seller-detail-button";
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

export const metadata = { title: "সেলার ম্যানেজমেন্ট" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "অনুমোদন অপেক্ষায়",
  APPROVED: "সক্রিয়",
  REJECTED: "বাতিল",
  SUSPENDED: "স্থগিত",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  SUSPENDED: "outline",
};

export default async function AdminSellersPage() {
  await requireAdminOrStaff("sellers");
  const sellers = await prisma.sellerProfile.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      shop: true,
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingCount = sellers.filter((s) => s.status === "PENDING").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">সেলার ম্যানেজমেন্ট</h1>
        <p className="text-sm text-muted-foreground">
          সেলার আবেদন অনুমোদন, বাতিল বা স্থগিত করুন
        </p>
      </div>

      {pendingCount > 0 && (
        <p className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <span className="font-semibold">{pendingCount}টি আবেদন</span> অনুমোদনের অপেক্ষায় আছে
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>শপ</TableHead>
              <TableHead>মালিক</TableHead>
              <TableHead>প্রোডাক্ট</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  এখনো কোনো সেলার আবেদন জমা পড়েনি
                </TableCell>
              </TableRow>
            )}
            {sellers.map((s) => {
              const isDeleted = s.deletedAt != null;
              return (
              <TableRow key={s.id}>
                <TableCell>
                  <p className="font-medium">{s.shop?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    আবেদন: {new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium" }).format(s.createdAt)}
                  </p>
                </TableCell>
                <TableCell>
                  <p>{s.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.user.email}
                    {s.user.phone ? ` • ${s.user.phone}` : ""}
                  </p>
                </TableCell>
                <TableCell>{s._count.products}</TableCell>
                <TableCell>
                  {isDeleted ? (
                    <Badge variant="destructive">ডিলিটেড</Badge>
                  ) : (
                    <Badge variant={STATUS_VARIANTS[s.status] ?? "secondary"}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </Badge>
                  )}
                  {s.status === "REJECTED" && s.rejectionReason && (
                    <p className="mt-1 max-w-48 truncate text-xs text-muted-foreground" title={s.rejectionReason}>
                      {s.rejectionReason}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <SellerDetailButton
                      seller={{
                        shopName: s.shop?.name ?? null,
                        description: s.shop?.description ?? null,
                        address: s.shop?.address ?? null,
                        ownerName: s.user.name,
                        email: s.user.email,
                        phone: s.user.phone,
                        bkashNumber: s.bkashNumber,
                        bankName: s.bankName,
                        bankAccountName: s.bankAccountName,
                        bankAccountNo: s.bankAccountNo,
                        appliedAt: new Intl.DateTimeFormat("bn-BD", {
                          dateStyle: "medium",
                        }).format(s.createdAt),
                        status: s.status,
                        statusLabel:
                          STATUS_LABELS[s.status] ?? s.status,
                        rejectionReason: s.rejectionReason,
                        productCount: s._count.products,
                      }}
                    />
                    {isDeleted ? (
                      <form action={reactivateSeller.bind(null, s.id)}>
                        <Button type="submit" size="sm" variant="outline">
                          পুনরুদ্ধার
                        </Button>
                      </form>
                    ) : (
                      <>
                        {s.status === "PENDING" && (
                          <>
                            <form action={approveSeller.bind(null, s.id)}>
                              <Button type="submit" size="sm">
                                অনুমোদন
                              </Button>
                            </form>
                            <SellerRejectButton sellerId={s.id} />
                          </>
                        )}
                        {s.status === "APPROVED" && (
                          <form action={suspendSeller.bind(null, s.id)}>
                            <Button type="submit" size="sm" variant="outline">
                              স্থগিত করুন
                            </Button>
                          </form>
                        )}
                        {(s.status === "REJECTED" || s.status === "SUSPENDED") && (
                          <form action={reactivateSeller.bind(null, s.id)}>
                            <Button type="submit" size="sm" variant="outline">
                              পুনরায় চালু
                            </Button>
                          </form>
                        )}
                        <SellerDeleteButton sellerId={s.id} shopName={s.shop?.name} />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
