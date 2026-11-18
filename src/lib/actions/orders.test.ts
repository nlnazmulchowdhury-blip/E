import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateOrderStatus, cancelOrder } from "./orders";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    order: { findUnique: vi.fn(), findFirst: vi.fn() },
    sellerProfile: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mocks.redirect(...args);
    const e = new Error("NEXT_REDIRECT") as Error & { digest: string };
    e.digest = "NEXT_REDIRECT";
    throw e; // আসল redirect-এর মতো ফ্লো থামায়
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

function makeTx() {
  return {
    order: { update: vi.fn(), findMany: vi.fn() },
    orderStatusHistory: { create: vi.fn() },
    shipment: { updateMany: vi.fn() },
    orderItem: { findMany: vi.fn() },
    inventory: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    payment: { updateMany: vi.fn() },
    transaction: { updateMany: vi.fn(), create: vi.fn() },
    commission: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 50 } }),
      updateMany: vi.fn(),
    },
    sellerProfile: { update: vi.fn() },
    auditLog: { create: vi.fn() },
  };
}

function subOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    parentId: "parent-1",
    sellerId: "seller-1",
    userId: "user-1",
    orderNumber: "SD-X-1",
    status: "PENDING",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
});

describe("updateOrderStatus — সাব-অর্ডার স্ট্যাটাস", () => {
  it("ADMIN SHIPPED করলে শিপমেন্ট IN_TRANSIT + হিস্টরি + প্যারেন্ট রিকম্পিউট", async () => {
    const tx = makeTx();
    mocks.prisma.order.findUnique.mockResolvedValue(subOrder({ status: "PACKED" }));
    mocks.prisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<void>) =>
      cb(tx)
    );
    // প্যারেন্ট রিকম্পিউট: অপর সাব এখনো PENDING
    tx.order.findMany.mockResolvedValue([{ status: "SHIPPED" }, { status: "PENDING" }]);
    tx.order.update.mockResolvedValue({
      orderNumber: "SD-X",
      userId: "user-1",
      total: 1000,
      paymentMethod: "COD",
    });

    await updateOrderStatus("sub-1", "SHIPPED");

    // সাব-অর্ডার আপডেট
    expect(tx.order.update.mock.calls[0]).toEqual([
      { where: { id: "sub-1" }, data: { status: "SHIPPED" } },
    ]);
    // হিস্টরি: কে, কী থেকে কীতে
    expect(tx.orderStatusHistory.create.mock.calls[0][0].data).toMatchObject({
      orderId: "sub-1",
      fromStatus: "PACKED",
      toStatus: "SHIPPED",
      changedByUserId: "admin-1",
      changedByRole: "ADMIN",
    });
    // শিপমেন্ট
    expect(tx.shipment.updateMany).toHaveBeenCalledWith({
      where: { orderId: "sub-1" },
      data: { status: "IN_TRANSIT", shippedAt: expect.any(Date) },
    });
    // প্যারেন্ট PENDING-ই থাকে (অপর সাব PENDING)
    const parentUpdate = tx.order.update.mock.calls.find(
      (c) => c[0].where.id === "parent-1"
    )!;
    expect(parentUpdate[0].data.status).toBe("PENDING");
    // অ্যাডমিনের AuditLog
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    // প্যারেন্ট হিস্টরি এন্ট্রি
    const parentHistory = tx.orderStatusHistory.create.mock.calls.find(
      (c) => c[0].data.orderId === "parent-1"
    )!;
    expect(parentHistory[0].data.changedByRole).toBe("SYSTEM");
    expect(parentHistory[0].data.note).toContain("SD-X-1");
  });

  it("সব সাব DELIVERED হলে প্যারেন্ট DELIVERED + COD পেমেন্ট PAID (Rule 6)", async () => {
    const tx = makeTx();
    mocks.prisma.order.findUnique.mockResolvedValue(subOrder({ status: "SHIPPED" }));
    mocks.prisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<void>) =>
      cb(tx)
    );
    tx.order.findMany.mockResolvedValue([{ status: "DELIVERED" }, { status: "DELIVERED" }]);
    tx.order.update.mockResolvedValue({
      orderNumber: "SD-X",
      userId: "user-1",
      total: 1000,
      paymentMethod: "COD",
    });

    await updateOrderStatus("sub-1", "DELIVERED");

    expect(tx.shipment.updateMany).toHaveBeenCalledWith({
      where: { orderId: "sub-1" },
      data: { status: "DELIVERED", deliveredAt: expect.any(Date) },
    });
    const parentUpdate = tx.order.update.mock.calls.find(
      (c) => c[0].where.id === "parent-1"
    )!;
    expect(parentUpdate[0].data.status).toBe("DELIVERED");
    // পেমেন্ট PAID + লেজার COMPLETED
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "parent-1" },
      data: { paymentStatus: "PAID" },
    });
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { orderId: "parent-1" },
      data: { status: "PAID" },
    });
    expect(tx.transaction.updateMany).toHaveBeenCalledWith({
      where: { orderId: "parent-1", type: "PAYMENT" },
      data: { status: "COMPLETED" },
    });
  });

  it("DELIVERED হলে সেলারের ব্যালেন্সে আয় যোগ হয় ও কমিশন PAID হয়", async () => {
    const tx = makeTx();
    mocks.prisma.order.findUnique.mockResolvedValue(
      subOrder({ status: "SHIPPED", subtotal: 1000 })
    );
    mocks.prisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<void>) =>
      cb(tx)
    );
    tx.order.findMany.mockResolvedValue([{ status: "DELIVERED" }]);
    tx.order.update.mockResolvedValue({
      orderNumber: "SD-X",
      userId: "user-1",
      total: 1000,
      paymentMethod: "COD",
    });
    tx.commission.aggregate.mockResolvedValue({ _sum: { amount: 50 } });

    await updateOrderStatus("sub-1", "DELIVERED");

    // কমিশন PAID
    expect(tx.commission.updateMany).toHaveBeenCalledWith({
      where: { orderId: "sub-1" },
      data: { status: "PAID", paidAt: expect.any(Date) },
    });
    // সেলার ব্যালেন্স: 1000 − 50 = 950
    expect(tx.sellerProfile.update).toHaveBeenCalledWith({
      where: { id: "seller-1" },
      data: { balance: { increment: 950 } },
    });
    // কমিশন লেজার এন্ট্রি
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reference: "comm-SD-X-1",
        type: "COMMISSION",
        amount: 50,
        sellerId: "seller-1",
      }),
    });
  });

  it("DELIVERED-এর পর RETURNED হলে সেলারের আয় ব্যালেন্স থেকে ফেরত যায়", async () => {
    const tx = makeTx();
    mocks.prisma.order.findUnique.mockResolvedValue(
      subOrder({ status: "DELIVERED", subtotal: 1000 })
    );
    mocks.prisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<void>) =>
      cb(tx)
    );
    tx.order.findMany.mockResolvedValue([{ status: "RETURNED" }]);
    tx.order.update.mockResolvedValue({
      orderNumber: "SD-X",
      userId: "user-1",
      total: 1000,
      paymentMethod: "COD",
    });
    tx.commission.aggregate.mockResolvedValue({ _sum: { amount: 50 } });

    await updateOrderStatus("sub-1", "RETURNED");

    expect(tx.commission.updateMany).toHaveBeenCalledWith({
      where: { orderId: "sub-1" },
      data: { status: "PENDING", paidAt: null },
    });
    expect(tx.sellerProfile.update).toHaveBeenCalledWith({
      where: { id: "seller-1" },
      data: { balance: { decrement: 950 } },
    });
  });

  it("অবৈধ ট্রানজিশনে কিছুই বদলায় না", async () => {
    mocks.prisma.order.findUnique.mockResolvedValue(subOrder({ status: "DELIVERED" }));

    await updateOrderStatus("sub-1", "CANCELLED");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("প্যারেন্ট অর্ডারের স্ট্যাটাস বদলানো যায় না", async () => {
    mocks.prisma.order.findUnique.mockResolvedValue(subOrder({ parentId: null }));

    await updateOrderStatus("sub-1", "CONFIRMED");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("SELLER শুধু নিজের সাব-অর্ডার বদলাতে পারে", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-user-1", role: "SELLER" } });
    mocks.prisma.order.findUnique.mockResolvedValue(subOrder({ sellerId: "other-seller" }));
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({ id: "seller-1" });

    await expect(updateOrderStatus("sub-1", "CONFIRMED")).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("CANCELLED করলে স্টক ফেরত যায়", async () => {
    const tx = makeTx();
    mocks.prisma.order.findUnique.mockResolvedValue(subOrder({ status: "CONFIRMED" }));
    mocks.prisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<void>) =>
      cb(tx)
    );
    tx.order.findMany.mockResolvedValue([{ status: "CANCELLED" }, { status: "CANCELLED" }]);
    tx.order.update.mockResolvedValue({
      orderNumber: "SD-X",
      userId: "user-1",
      total: 1000,
      paymentMethod: "COD",
    });
    tx.orderItem.findMany.mockResolvedValue([
      { productId: "prod-1", variantId: null, quantity: 2 },
    ]);
    tx.inventory.findMany.mockResolvedValue([
      { id: "inv-1", productId: "prod-1", variantId: null, stock: 8 },
    ]);

    await updateOrderStatus("sub-1", "CANCELLED");

    expect(tx.inventory.updateMany).toHaveBeenCalledWith({
      where: { productId: "prod-1", variantId: null },
      data: { stock: { increment: 2 } },
    });
  });
});

describe("cancelOrder — কাস্টমার ক্যানসেল", () => {
  it("PENDING প্যারেন্ট বাতিল: সব সাব CANCELLED, স্টক ফেরত, পেমেন্ট FAILED", async () => {
    const tx = makeTx();
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "CUSTOMER" } });
    mocks.prisma.order.findFirst.mockResolvedValue({
      id: "parent-1",
      userId: "user-1",
      status: "PENDING",
      paymentStatus: "PENDING",
      subOrders: [
        { id: "sub-1", status: "PENDING" },
        { id: "sub-2", status: "PENDING" },
      ],
    });
    mocks.prisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<void>) =>
      cb(tx)
    );
    tx.orderItem.findMany.mockResolvedValue([
      { productId: "prod-1", variantId: null, quantity: 1 },
    ]);
    tx.inventory.findMany.mockResolvedValue([
      { id: "inv-1", productId: "prod-1", variantId: null, stock: 10 },
    ]);

    await cancelOrder("parent-1");

    // দুই সাবই CANCELLED
    const subUpdates = tx.order.update.mock.calls.filter(
      (c) => c[0].where.id !== "parent-1"
    );
    expect(subUpdates).toHaveLength(2);
    for (const call of subUpdates) {
      expect(call[0].data.status).toBe("CANCELLED");
    }
    // হিস্টরি: CUSTOMER ভূমিকায়
    const subHistories = tx.orderStatusHistory.create.mock.calls.filter(
      (c) => c[0].data.orderId !== "parent-1"
    );
    expect(subHistories).toHaveLength(2);
    expect(subHistories[0][0].data).toMatchObject({
      toStatus: "CANCELLED",
      changedByUserId: "user-1",
      changedByRole: "CUSTOMER",
    });
    // স্টক রিস্টোর ×২ সাব
    expect(tx.inventory.updateMany).toHaveBeenCalledTimes(2);
    // প্যারেন্ট CANCELLED + পেমেন্ট FAILED
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "parent-1" },
      data: { status: "CANCELLED", paymentStatus: "FAILED" },
    });
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { orderId: "parent-1" },
      data: { status: "FAILED" },
    });
    expect(tx.transaction.updateMany).toHaveBeenCalledWith({
      where: { orderId: "parent-1", type: "PAYMENT", status: "PENDING" },
      data: { status: "FAILED" },
    });
  });

  it("DELIVERED প্যারেন্ট কাস্টমার বাতিল করতে পারে না", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "CUSTOMER" } });
    mocks.prisma.order.findFirst.mockResolvedValue({
      id: "parent-1",
      userId: "user-1",
      status: "DELIVERED",
      paymentStatus: "PAID",
      subOrders: [{ id: "sub-1", status: "DELIVERED" }],
    });

    await cancelOrder("parent-1");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("অন্য কাস্টমারের অর্ডার বাতিল করা যায় না (Rule 2)", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "CUSTOMER" } });
    mocks.prisma.order.findFirst.mockResolvedValue(null); // userId ফিল্টারে মেলে না

    await cancelOrder("parent-1");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
