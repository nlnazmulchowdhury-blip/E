import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldX } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "অ্যাক্সেস নেই" };

export default async function AccessDeniedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldX className="size-8" />
      </span>
      <h1 className="text-2xl font-bold">আপনার এই পেজে অ্যাক্সেস নেই</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        এই পেজটি শুধুমাত্র অনুমোদিত ইউজারদের জন্য। আপনি{" "}
        <span className="font-medium">{session.user.name ?? session.user.email}</span> হিসেবে লগইন
        আছেন — অন্য অ্যাকাউন্টে ঢুকতে হলে আগে লগআউট করুন।
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">হোম পেজে যান</Link>
        </Button>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="outline" className="cursor-pointer">
            লগআউট করে অন্য অ্যাকাউন্টে লগইন করুন
          </Button>
        </form>
      </div>
    </div>
  );
}
