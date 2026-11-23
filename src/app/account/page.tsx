import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Heart, Package, ChevronRight } from "lucide-react";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "আমার অ্যাকাউন্ট" };

const links = [
  {
    href: "/account/orders",
    label: "আমার অর্ডার",
    description: "অর্ডার তালিকা ও ট্র্যাকিং",
    icon: Package,
  },
  {
    href: "/wishlist",
    label: "উইশলিস্ট",
    description: "পছন্দের প্রোডাক্ট",
    icon: Heart,
  },
  {
    href: "/account/notifications",
    label: "নোটিফিকেশন",
    description: "অর্ডার ও অ্যাকাউন্টের খবর",
    icon: Bell,
  },
];

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">আমার অ্যাকাউন্ট</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {session.user.name} · {session.user.email}
      </p>

      <div className="mt-6 space-y-2">
        {links.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs text-muted-foreground">{description}</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
