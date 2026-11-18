import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ShopSettingsForm } from "@/components/seller/shop-settings-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "শপ সেটিংস" };

export default async function SellerSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/access-denied");

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    include: { shop: true },
  });
  if (!profile || profile.status !== "APPROVED" || !profile.shop) {
    redirect("/access-denied");
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">শপ সেটিংস</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        শপের নাম, বিবরণ, লোগো ও ব্যানার আপডেট করুন
      </p>
      <ShopSettingsForm
        shop={{
          name: profile.shop.name,
          description: profile.shop.description,
          address: profile.shop.address,
          logoUrl: profile.shop.logoUrl,
          bannerUrl: profile.shop.bannerUrl,
          bkashNumber: profile.bkashNumber,
          bankName: profile.bankName,
          bankAccountName: profile.bankAccountName,
          bankAccountNo: profile.bankAccountNo,
        }}
      />
    </div>
  );
}
