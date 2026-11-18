import Link from "next/link";
import { Wallet, TrendingUp, HandCoins } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBDT, formatDate } from "@/lib/format";
import { WithdrawalForm } from "@/components/seller/withdrawal-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "আয় ও ব্যালেন্স" };

const WD_STATUS_LABELS: Record<string, string> = {
  PENDING: "অনুমোদন অপেক্ষায়",
  APPROVED: "অনুমোদিত",
  PAID: "পরিশোধিত",
  REJECTED: "বাতিল",
};

const METHOD_LABELS: Record<string, string> = {
  BKASH: "বিকাশ",
  BANK: "ব্যাংক",
};

export default async function SellerEarningsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/access-denied");

  const profile = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile || profile.status !== "APPROVED") redirect("/access-denied");

  const [commissions, withdrawals] = await Promise.all([
    prisma.commission.findMany({
      where: { sellerId: profile.id },
      include: { orderItem: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.withdrawal.findMany({
      where: { sellerId: profile.id },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  const paidCommission = commissions
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingCommission = commissions
    .filter((c) => c.status === "PENDING")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const balance = Number(profile.balance);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">আয় ও ব্যালেন্স</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="size-4" />
            <span className="text-xs font-medium">উত্তোলনযোগ্য ব্যালেন্স</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-primary">{formatBDT(balance)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="size-4" />
            <span className="text-xs font-medium">মোট কমিশন (পরিশোধিত)</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{formatBDT(paidCommission)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <HandCoins className="size-4" />
            <span className="text-xs font-medium">পেন্ডিং কমিশন</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{formatBDT(pendingCommission)}</p>
        </div>
      </div>

      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        {/* উইথড্র ফর্ম */}
        <div>
          <h2 className="mb-3 font-semibold">টাকা তুলুন</h2>
          <div className="rounded-xl border bg-card p-5">
            <WithdrawalForm balance={balance} />
            <p className="mt-3 text-xs text-muted-foreground">
              {profile.bkashNumber
                ? `বিকাশ: ${profile.bkashNumber}`
                : "বিকাশ নম্বর দেওয়া নেই — "}
              {profile.bankName && profile.bankAccountNo
                ? ` • ব্যাংক: ${profile.bankName} (${profile.bankAccountNo})`
                : ""}
              {(profile.bkashNumber || profile.bankName) && (
                <Link
                  href="/seller/settings"
                  className="ml-1 text-primary hover:underline"
                >
                  পরিবর্তন করুন
                </Link>
              )}
              {!profile.bkashNumber && !profile.bankName && (
                <Link
                  href="/seller/settings"
                  className="ml-1 text-primary hover:underline"
                >
                  শপ সেটিংসে পেমেন্ট তথ্য যোগ করুন
                </Link>
              )}
            </p>
          </div>
        </div>

        {/* উইথড্র হিস্ট্রি */}
        <div>
          <h2 className="mb-3 font-semibold">উইথড্র হিস্ট্রি</h2>
          {withdrawals.length === 0 ? (
            <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              কোনো উইথড্র রিকোয়েস্ট নেই
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="divide-y">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-semibold">{formatBDT(w.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {METHOD_LABELS[w.method] ?? w.method} • {formatDate(w.requestedAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        w.status === "PAID"
                          ? "default"
                          : w.status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {WD_STATUS_LABELS[w.status] ?? w.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* কমিশন তালিকা */}
      <h2 className="mb-3 font-semibold">কমিশন তালিকা</h2>
      {commissions.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          এখনো কোনো বিক্রি হয়নি
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="divide-y">
            {commissions.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium">{c.orderItem.title}</p>
                  <p className="text-xs text-muted-foreground">
                    রেট {Number(c.rate)}% • {formatDate(c.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatBDT(c.amount)}</p>
                  <Badge variant={c.status === "PAID" ? "default" : "secondary"}>
                    {c.status === "PAID" ? "পরিশোধিত" : "পেন্ডিং"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
