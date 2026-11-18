import { Users, Store, Package, ShoppingBag, Clock, Wallet } from "lucide-react";
import { getAdminStats } from "@/lib/data";
import { formatBDT } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
