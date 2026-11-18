import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { buildAuditFilter, AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/audit-filter";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export const metadata = { title: "অডিট লগ" };

const ACTION_LABELS: Record<string, string> = {
  CREATE: "তৈরি",
  UPDATE: "আপডেট",
  DELETE: "মুছে ফেলা",
  APPROVE: "অনুমোদন",
  REJECT: "বাতিল",
  STATUS_CHANGE: "স্ট্যাটাস বদল",
};

const ENTITY_LABELS: Record<string, string> = {
  CATEGORY: "ক্যাটাগরি",
  PRODUCT: "প্রোডাক্ট",
  ORDER: "অর্ডার",
  SELLER: "সেলার",
  COUPON: "কুপন",
  SHIPMENT: "শিপমেন্ট",
  RETURN: "রিটার্ন",
  WITHDRAWAL: "উইথড্র",
  SETTING: "সেটিং",
  COMMISSION: "কমিশন",
  USER: "ইউজার",
};

function detailsText(details: unknown): string {
  if (details == null) return "—";
  try {
    const s = JSON.stringify(details);
    return s.length > 120 ? `${s.slice(0, 120)}…` : s;
  } catch {
    return String(details);
  }
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; q?: string }>;
}) {
  await requireAdminOrStaff(); // অডিট লগ শুধু ADMIN দেখতে পারে
  const sp = await searchParams;
  const where = buildAuditFilter(sp);

  const logs = await prisma.auditLog.findMany({
    where,
    include: { admin: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const selectClass =
    "h-8 rounded-md border border-input bg-transparent px-2 text-xs";

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">অডিট লগ</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        অ্যাডমিনের প্রতিটি কার্যক্রমের হিসাব — কে, কী, কবে করেছে
      </p>

      <form className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
        <select name="entity" defaultValue={sp.entity ?? ""} className={selectClass}>
          <option value="">সব মডিউল</option>
          {AUDIT_ENTITIES.map((e) => (
            <option key={e} value={e}>
              {ENTITY_LABELS[e]}
            </option>
          ))}
        </select>
        <select name="action" defaultValue={sp.action ?? ""} className={selectClass}>
          <option value="">সব অ্যাকশন</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="অ্যাডমিনের নাম খুঁজুন"
          className="h-8 w-48 rounded-md border border-input bg-transparent px-2 text-xs"
        />
        <button
          type="submit"
          className="h-8 rounded-md bg-navy px-3 text-xs font-medium text-white hover:bg-navy/90"
        >
          ফিল্টার
        </button>
        {(sp.action || sp.entity || sp.q) && (
          <a href="/admin/audit-logs" className="text-xs text-muted-foreground hover:underline">
            ফিল্টার মুছুন
          </a>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>সময়</TableHead>
              <TableHead>অ্যাডমিন</TableHead>
              <TableHead>অ্যাকশন</TableHead>
              <TableHead>মডিউল</TableHead>
              <TableHead>আইডি</TableHead>
              <TableHead>বিস্তারিত</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  কোনো অডিট লগ নেই
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {formatDate(log.createdAt)}
                </TableCell>
                <TableCell className="text-sm">
                  {log.admin.name}
                  <span className="block text-xs text-muted-foreground">{log.admin.email}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {ENTITY_LABELS[log.entity] ?? log.entity}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {log.entityId ?? "—"}
                </TableCell>
                <TableCell className="max-w-xs font-mono text-xs text-muted-foreground">
                  {detailsText(log.details)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        সর্বশেষ ১০০টি এন্ট্রি দেখানো হচ্ছে
      </p>
    </div>
  );
}
