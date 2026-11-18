import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { auth } from "@/auth";
import { getNotifications } from "@/lib/data";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "নোটিফিকেশন" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const notifications = await getNotifications(session.user.id);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">নোটিফিকেশন</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount}টি অপঠিত নোটিফিকেশন` : "সব নোটিফিকেশন পড়া হয়েছে"}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">
              সব পঠিত করুন
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center">
          <Bell className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 font-medium">এখনো কোনো নোটিফিকেশন নেই</p>
          <p className="mt-1 text-sm text-muted-foreground">
            অর্ডার, শপের আবেদন বা অ্যাকাউন্ট সংক্রান্ত খবর এখানে দেখা যাবে
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${
                n.read ? "bg-card" : "border-primary/30 bg-primary/5"
              }`}
            >
              <div>
                <p className={`text-sm ${n.read ? "" : "font-semibold"}`}>{n.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("bn-BD", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(n.createdAt)}
                </p>
              </div>
              {!n.read && (
                <form action={markNotificationRead.bind(null, n.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    পঠিত
                  </Button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
