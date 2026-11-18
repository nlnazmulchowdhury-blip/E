import Link from "next/link";
import { redirect } from "next/navigation";
import { Store, Clock, Ban } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BecomeSellerForm } from "@/components/seller/become-seller-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "সেলার হোন" };

export default async function BecomeSellerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/become-seller");

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    include: { shop: true },
  });

  if (profile?.status === "APPROVED") redirect("/seller");

  if (profile?.status === "PENDING") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Clock className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">আবেদন প্রক্রিয়াধীন</h1>
        <p className="mt-2 text-muted-foreground">
          আপনার শপ <span className="font-medium text-foreground">{profile.shop?.name}</span>{" "}
          অনুমোদনের অপেক্ষায় আছে। অ্যাডমিন অনুমোদন দিলেই আপনি সেলার প্যানেল পাবেন।
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">হোম পেজে ফিরুন</Link>
        </Button>
      </div>
    );
  }

  if (profile?.status === "SUSPENDED") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Ban className="mx-auto size-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">শপ স্থগিত আছে</h1>
        <p className="mt-2 text-muted-foreground">
          আপনার শপ সাময়িকভাবে স্থগিত করা হয়েছে। বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">হোম পেজে ফিরুন</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Store className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">ShopDesh-এ সেলার হোন</h1>
          <p className="text-sm text-muted-foreground">
            আপনার শপ খুলুন, প্রোডাক্ট আপলোড করুন, অর্ডার ম্যানেজ করুন
          </p>
        </div>
      </div>

      {profile?.status === "REJECTED" && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-semibold text-destructive">আগের আবেদনটি বাতিল করা হয়েছিল</p>
          {profile.rejectionReason && (
            <p className="mt-1">
              <span className="font-medium">কারণ:</span> {profile.rejectionReason}
            </p>
          )}
          <p className="mt-1">তথ্য ঠিক করে আবার আবেদন করতে পারেন।</p>
        </div>
      )}

      <BecomeSellerForm />
    </div>
  );
}
