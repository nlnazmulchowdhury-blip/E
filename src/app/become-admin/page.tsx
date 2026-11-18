import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BecomeAdminForm } from "@/components/become-admin-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "অ্যাডমিন রিকোয়েস্ট" };

export default async function BecomeAdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/become-admin");

  if (session.user.role === "ADMIN") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <ShieldCheck className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">আপনি ইতিমধ্যে অ্যাডমিন</h1>
        <p className="mt-2 text-muted-foreground">
          আপনার অ্যাকাউন্টে অ্যাডমিন অ্যাক্সেস আছে।
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/admin">অ্যাডমিন প্যানেলে যান</Link>
        </Button>
      </div>
    );
  }

  const request = await prisma.adminRequest.findUnique({
    where: { userId: session.user.id },
  });

  if (request?.status === "PENDING") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Clock className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">অনুরোধ রিভিউ অপেক্ষায়</h1>
        <p className="mt-2 text-muted-foreground">
          আপনার অ্যাডমিন রিকোয়েস্ট অ্যাডমিনের রিভিউর অপেক্ষায় আছে। অনুমোদন পেলে আবার
          লগইন করলেই অ্যাডমিন প্যানেল পাবেন।
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">হোম পেজে ফিরুন</Link>
        </Button>
      </div>
    );
  }

  if (request?.status === "APPROVED") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto size-12 text-green-600" />
        <h1 className="mt-4 text-2xl font-bold">অনুরোধ অনুমোদিত হয়েছে</h1>
        <p className="mt-2 text-muted-foreground">
          অভিনন্দন! আপনি এখন অ্যাডমিন। লগআউট করে আবার লগইন করুন — নতুন role সেশনে
          যোগ হবে।
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">হোম পেজে ফিরুন</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8 text-center">
        <ShieldCheck className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">অ্যাডমিন রিকোয়েস্ট</h1>
        <p className="mt-2 text-muted-foreground">
          অ্যাডমিন হতে চাইলে কারণসহ রিকোয়েস্ট পাঠান। অ্যাডমিন রিভিউ করে সিদ্ধান্ত
          নেবেন।
        </p>
      </div>

      {request?.status === "REJECTED" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <p className="text-sm text-muted-foreground">
            আপনার আগের অনুরোধটি প্রত্যাখ্যান করা হয়েছে। চাইলে আবার রিকোয়েস্ট পাঠাতে
            পারেন।
          </p>
        </div>
      )}

      <BecomeAdminForm previousReason={request?.status === "REJECTED" ? request.reason : undefined} />
    </div>
  );
}
