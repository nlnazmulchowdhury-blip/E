import { Users, Store, Package, ShoppingBag, Clock, Wallet } from "lucide-react";
import { getAdminStats } from "@/lib/data";
import { formatBDT } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "অ্যাডমিন ড্যাশবোর্ড" };

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  const cards = [
    { label: "মোট কাস্টমার", value: stats.customers, icon: Users },
    { label: "মোট সেলার", value: stats.sellers, icon: Store },
    { label: "মোট প্রোডাক্ট", value: stats.products, icon: Package },
    { label: "মোট অর্ডার", value: stats.orders, icon: ShoppingBag },
    { label: "অনুমোদন অপেক্ষায়", value: stats.pendingProducts, icon: Clock },
    { label: "মোট আয়", value: formatBDT(stats.revenue), icon: Wallet },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">ড্যাশবোর্ড</h1>
      {/* ফোনেও দুই কলাম, ডেস্কটপে তিন — সাধারণ প্যাডিং দিয়ে আঁকা,
          তাই পুরোনো মোবাইল ব্রাউজারেও কার্ডগুলো সমানভাবে সাজে */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="min-w-0 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-xs leading-snug font-medium text-muted-foreground sm:text-sm">
                {c.label}
              </p>
              <c.icon className="size-4 shrink-0 text-muted-foreground" />
            </div>
            <p className="mt-1.5 truncate text-xl font-bold sm:mt-2 sm:text-2xl">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
