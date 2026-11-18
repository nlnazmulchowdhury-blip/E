"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeParentStatus, ALLOWED_TRANSITIONS, type OrderStatus } from "@/lib/order-status";

async function sessionUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// ক্যানসেল হলে স্টক ফেরত — ডিক্রিমেন্টের বিপরীত নিয়মে
async function restoreStock(
  tx: TxClient,
  productId: string,
  variantId: string | null,
  quantity: number
) {
  const rows = await tx.inventory.findMany({ where: { productId } });
  if (variantId !== null) {
    await tx.inventory.updateMany({
      where: { productId, variantId },
      data: { stock: { increment: quantity } },
    });
    return;
  }
  const variantRows = rows.filter((r) => r.variantId !== null);
  if (variantRows.length > 0) {
    let remaining = quantity;
    for (const row of variantRows) {
      if (remaining <= 0) break;
      await tx.inventory.update({
        where: { id: row.id },
        data: { stock: { increment: remaining } },
      });
      remaining = 0;
    }
    return;
  }
  await tx.inventory.updateMany({
    where: { productId, variantId: null },
    data: { stock: { increment: quantity } },
  });
}

async function recomputeParent(tx: TxClient, parentId: string) {
  const subs = await tx.order.findMany({
    where: { parentId },
    select: { status: true },
  });
  const parentStatus = computeParentStatus(subs.map((s) => s.status as OrderStatus));
  const parent = await tx.order.update({
    where: { id: parentId },
    data: { status: parentStatus },
  });

  // Rule: পেমেন্ট সফল/ডেলিভার হওয়ার আগে Paid নয় — COD হলে সব সাব-অর্ডার
  // ডেলিভার হওয়ার পরই Parent PAID হয়
  if (parentStatus === "DELIVERED" && parent.paymentMethod === "COD") {
    await tx.order.update({
      where: { id: parentId },
      data: { paymentStatus: "PAID" },
    });
    await tx.payment.updateMany({
      where: { orderId: parentId },
      data: { status: "PAID" },
    });
    await tx.transaction.updateMany({
      where: { orderId: parentId, type: "PAYMENT" },
      data: { status: "COMPLETED" },
    });
  }

  if (parentStatus === "REFUNDED") {
    await tx.order.update({
      where: { id: parentId },
      data: { paymentStatus: "REFUNDED" },
    });
    await tx.payment.updateMany({
      where: { orderId: parentId },
      data: { status: "REFUNDED" },
    });
    await tx.transaction.create({
      data: {
        reference: `ref-${parent.orderNumber}`,
        type: "REFUND",
        amount: parent.total ? Number(parent.total) : 0,
        method: parent.paymentMethod ?? "COD",
        status: "COMPLETED",
        description: `Refund for ${parent.orderNumber}`,
        orderId: parentId,
        userId: parent.userId,
      },
    });
  }

  return parentStatus;
}

export async function updateOrderStatus(orderId: string, status: string) {
  const user = await sessionUser();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !order.parentId) return; // শুধু সাব-অর্ডারের স্ট্যাটাস বদলায়
  const parentId = order.parentId;

  if (user.role === "SELLER") {
    const seller = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
    if (!seller || order.sellerId !== seller.id) redirect("/login");
  } else if (user.role !== "ADMIN") {
    redirect("/login");
  }

  const fromStatus = order.status as OrderStatus;
  if (!ALLOWED_TRANSITIONS[fromStatus]?.includes(status as OrderStatus)) return;
  const toStatus = status as OrderStatus;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: toStatus },
    });

    // Status History — কে, কখন, কী থেকে কী তে
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus,
        toStatus,
        changedByUserId: user.id,
        changedByRole: user.role,
      },
    });

    if (toStatus === "SHIPPED") {
      await tx.shipment.updateMany({
        where: { orderId },
        data: { status: "IN_TRANSIT", shippedAt: new Date() },
      });
    }

    if (toStatus === "DELIVERED") {
      await tx.shipment.updateMany({
        where: { orderId },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });

      // ডেলিভারি হলেই সেলারের আয় ব্যালেন্সে যোগ হয়: subtotal − কমিশন
      if (order.sellerId) {
        const commissionAgg = await tx.commission.aggregate({
          _sum: { amount: true },
          where: { orderId },
        });
        const commissionTotal = Number(commissionAgg._sum.amount ?? 0);
        const earnings = Number(order.subtotal) - commissionTotal;

        await tx.commission.updateMany({
          where: { orderId },
          data: { status: "PAID", paidAt: new Date() },
        });
        if (earnings > 0) {
          await tx.sellerProfile.update({
            where: { id: order.sellerId },
            data: { balance: { increment: earnings } },
          });
        }
        await tx.transaction.create({
          data: {
            reference: `comm-${order.orderNumber}`,
            type: "COMMISSION",
            amount: commissionTotal,
            method: "INHOUSE",
            status: "COMPLETED",
            description: `Commission for ${order.orderNumber}`,
            orderId,
            sellerId: order.sellerId,
          },
        });
      }
    }

    if (toStatus === "RETURNED") {
      await tx.shipment.updateMany({
        where: { orderId },
        data: { status: "RETURNED" },
      });

      // ডেলিভারের পর রিটার্ন — আগে ক্রেডিট করা আয় ব্যালেন্স থেকে ফেরত নেওয়া হয়
      if (fromStatus === "DELIVERED" && order.sellerId) {
        const commissionAgg = await tx.commission.aggregate({
          _sum: { amount: true },
          where: { orderId },
        });
        const commissionTotal = Number(commissionAgg._sum.amount ?? 0);
        const earnings = Number(order.subtotal) - commissionTotal;

        await tx.commission.updateMany({
          where: { orderId },
          data: { status: "PENDING", paidAt: null },
        });
        if (earnings > 0) {
          await tx.sellerProfile.update({
            where: { id: order.sellerId },
            data: { balance: { decrement: earnings } },
          });
        }
      }
    }

    if (toStatus === "CANCELLED") {
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        await restoreStock(tx, item.productId, item.variantId, item.quantity);
      }
    }

    if (user.role === "ADMIN") {
      await tx.auditLog.create({
        data: {
          adminId: user.id,
          action: "STATUS_CHANGE",
          entity: "ORDER",
          entityId: orderId,
          details: { from: fromStatus, to: toStatus },
        },
      });
    }

    const parentStatus = await recomputeParent(tx, parentId);
    await tx.orderStatusHistory.create({
      data: {
        orderId: parentId,
        fromStatus: order.status,
        toStatus: parentStatus,
        changedByRole: "SYSTEM",
        note: `সাব-অর্ডার ${order.orderNumber} → ${toStatus}`,
      },
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath("/seller/orders");
  revalidatePath(`/seller/orders/${orderId}`);
  revalidatePath(`/account/orders/${order.parentId}`);
}

export async function cancelOrder(parentOrderId: string) {
  const user = await sessionUser();

  const parent = await prisma.order.findFirst({
    where: { id: parentOrderId, userId: user.id },
    include: { subOrders: true },
  });
  if (!parent) return;
  if (!["PENDING", "CONFIRMED"].includes(parent.status)) return;

  await prisma.$transaction(async (tx) => {
    for (const sub of parent.subOrders) {
      if (sub.status === "CANCELLED") continue;
      await tx.order.update({
        where: { id: sub.id },
        data: { status: "CANCELLED" },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: sub.id,
          fromStatus: sub.status,
          toStatus: "CANCELLED",
          changedByUserId: user.id,
          changedByRole: "CUSTOMER",
          note: "কাস্টমার অর্ডার বাতিল করেছেন",
        },
      });
      const items = await tx.orderItem.findMany({ where: { orderId: sub.id } });
      for (const item of items) {
        await restoreStock(tx, item.productId, item.variantId, item.quantity);
      }
    }

    await tx.order.update({
      where: { id: parent.id },
      data: { status: "CANCELLED", paymentStatus: parent.paymentStatus === "PAID" ? parent.paymentStatus : "FAILED" },
    });
    await tx.payment.updateMany({
      where: { orderId: parent.id },
      data: { status: "FAILED" },
    });
    await tx.transaction.updateMany({
      where: { orderId: parent.id, type: "PAYMENT", status: "PENDING" },
      data: { status: "FAILED" },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: parent.id,
        fromStatus: parent.status,
        toStatus: "CANCELLED",
        changedByUserId: user.id,
        changedByRole: "CUSTOMER",
        note: "কাস্টমার অর্ডার বাতিল করেছেন",
      },
    });
  });

  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${parent.id}`);
  revalidatePath("/admin/orders");
}
