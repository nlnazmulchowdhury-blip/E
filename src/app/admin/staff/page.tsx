import { requireAdminOrStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { approveAdminRequest, rejectAdminRequest } from "@/lib/actions/admin";
import { formatDate } from "@/lib/format";
import { StaffCreateForm } from "@/components/admin/staff-create-form";
import { StaffPermissionsForm } from "@/components/admin/staff-permissions-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requireAdminOrStaff();

  const [staffList, adminRequests] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STAFF" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.adminRequest.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "অপেক্ষমাণ",
    APPROVED: "অনুমোদিত",
    REJECTED: "প্রত্যাখ্যাত",
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">স্টাফ ও পারমিশন</h1>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">অ্যাডমিন রোল রিকোয়েস্ট</h2>
        {adminRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">কোনো অ্যাডমিন রিকোয়েস্ট নেই</p>
        ) : (
          <div className="space-y-3">
            {adminRequests.map((req) => (
              <div key={req.id} className="space-y-2 rounded-xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{req.user.name}</p>
                  <p className="text-xs text-muted-foreground">{req.user.email}</p>
                  <Badge
                    variant={
                      req.status === "APPROVED"
                        ? "default"
                        : req.status === "REJECTED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {STATUS_LABELS[req.status]}
                  </Badge>
                  <p className="ml-auto text-xs text-muted-foreground">
                    {formatDate(req.createdAt)}
                  </p>
                </div>
                <p className="rounded-lg bg-muted/40 p-3 text-sm">{req.reason}</p>
                {req.status === "PENDING" && (
                  <div className="flex gap-2">
                    <form action={approveAdminRequest.bind(null, req.id)}>
                      <Button type="submit" size="sm">
                        অনুমোদন
                      </Button>
                    </form>
                    <form action={rejectAdminRequest.bind(null, req.id)}>
                      <Button type="submit" size="sm" variant="destructive">
                        প্রত্যাখ্যান
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <StaffCreateForm />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">স্টাফ অ্যাকাউন্ট</h2>
        {staffList.length === 0 ? (
          <p className="text-sm text-muted-foreground">এখনো কোনো স্টাফ অ্যাকাউন্ট নেই</p>
        ) : (
          staffList.map((staff) => <StaffPermissionsForm key={staff.id} staff={staff} />)
        )}
      </div>
    </div>
  );
}
