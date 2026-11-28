"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AdminNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ReactNode;
};

// ফোনে সাইডবার লুকানো থাকে — তাই অ্যাডমিন সেকশনগুলোর মধ্যে যাওয়ার জন্য
// স্ক্রল করা যায় এমন চিপ-নেভিগেশন (ডেস্কটপে সাইডবারই যথেষ্ট)
export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();

  const isActive = (item: AdminNavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <nav
      aria-label="অ্যাডমিন মেনু"
      className="fixed inset-x-0 top-14 z-40 border-b bg-background/95 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive(item)
                ? "border-primary bg-primary text-white"
                : "bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
