import type { Prisma } from "@prisma/client";

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "STATUS_CHANGE",
] as const;

export const AUDIT_ENTITIES = [
  "CATEGORY",
  "PRODUCT",
  "ORDER",
  "SELLER",
  "COUPON",
  "SHIPMENT",
  "RETURN",
  "WITHDRAWAL",
  "SETTING",
  "COMMISSION",
  "USER",
] as const;

export type AuditFilterInput = {
  action?: string;
  entity?: string;
  q?: string;
};

// অজানা ভ্যালু ফিল্টারে যায় না — শুধু বৈধ অ্যাকশন/এন্টিটি প্রযোজ্য হয়
export function buildAuditFilter({
  action,
  entity,
  q,
}: AuditFilterInput): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (action && (AUDIT_ACTIONS as readonly string[]).includes(action)) {
    where.action = action;
  }
  if (entity && (AUDIT_ENTITIES as readonly string[]).includes(entity)) {
    where.entity = entity;
  }
  if (q && q.trim()) {
    where.admin = {
      name: { contains: q.trim(), mode: "insensitive" },
    };
  }

  return where;
}
