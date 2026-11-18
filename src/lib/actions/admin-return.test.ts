import { describe, it, expect, vi, beforeEach } from "vitest";
import { decideReturnRequest } from "./admin";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  updateOrderStatus: vi.fn(),
  prisma: {
    returnRequest: { findUnique: vi.fn(), update: vi.fn() },
    orderItem: { findUnique: vi.fn() },
    order: { findUnique: vi.fn() },
    transaction: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mocks.redirect(...args);
    const e = new Error("NEXT_REDIRECT") as Error & { digest: string };
    e.digest = "NEXT_REDIRECT";
    throw e;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/actions/orders", () => ({
  updateOrderStatus: mocks.updateOrderStatus,
}));
vi.mock("@/lib/format", () => ({
  slugify: (s: string) => s,
  formatBDT: (n: number) => `৳${n}`,
}));

const REQUEST = {
  id: "req-1",
  orderId: "sub-1",
  orderItemId: "item-1",
  userId: "u-1",
  reason: "পণ্য নষ্ট",
  status: "REQUESTED",
  order: { orderNumber: "S-1001", status: "DELIVERED" },
};

function form(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("decision", "APPROVED");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
  mocks.prisma.returnRequest.findUnique.mockResolvedValue({ ...REQUEST });
  mocks.prisma.orderItem.findUnique.mockResolvedValue({
    id: "item-1",
    price: 1499,
    quantity: 1,
  });
  mocks.prisma.order.findUnique.mockResolvedValue({
    parentId: "p-1",
    orderNumber: "S-1001",
  });
});

describe("decideReturnRequest — বাতিল", () => {
  it("REJECTED হলে রিকোয়েস্ট বাতিল হয় ও অর্ডার অক্ষত থাকে", async () => {
    const result = await decideReturnRequest("req-1", {}, form({ decision: "REJECTED", adminNote: "ছবি প্রমাণ নেই" }));

    expect(mocks.prisma.returnRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: expect.objectContaining({ status: "REJECTED", adminNote: "ছবি প্রমাণ নেই" }),
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "REJECT",
        entity: "RETURN",
        entityId: "req-1",
        details: { orderId: "sub-1", note: "ছবি প্রমাণ নেই" },
      },
    });
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/returns");
    expect(result.message).toBe("রিটার্ন রিকোয়েস্ট বাতিল করা হয়েছে");
  });

  it("সিদ্ধান্ত না দিলে এরর", async () => {
    const result = await decideReturnRequest("req-1", {}, form({ decision: "" }));
    expect(result.errors?.decision?.[0]).toBe("সিদ্ধান্ত নির্বাচন করুন");
    expect(mocks.prisma.returnRequest.update).not.toHaveBeenCalled();
  });

  it("ইতিমধ্যে প্রসেস করা রিকোয়েস্টে কিছু হয় না", async () => {
    mocks.prisma.returnRequest.findUnique.mockResolvedValue({
      ...REQUEST,
      status: "REFUNDED",
    });
    const result = await decideReturnRequest("req-1", {}, form());
    expect(result.message).toBe("এই রিকোয়েস্ট ইতিমধ্যে প্রসেস করা হয়েছে");
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });
});

describe("decideReturnRequest — অনুমোদন", () => {
  it("রিফান্ড ছাড়া APPROVED হলে অর্ডার RETURNED হয়", async () => {
    const result = await decideReturnRequest("req-1", {}, form({ refundAmount: "" }));

    expect(mocks.updateOrderStatus).toHaveBeenCalledTimes(1);
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith("sub-1", "RETURNED");
    expect(mocks.prisma.returnRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: expect.objectContaining({ status: "APPROVED", refundAmount: null }),
    });
    expect(mocks.prisma.transaction.create).not.toHaveBeenCalled();
    expect(result.message).toBe("রিটার্ন অনুমোদিত হয়েছে");
  });

  it("আংশিক রিফান্ডে RETURNED→REFUNDED হয় ও সাব-লেভেল রিফান্ড লেজার লেখা হয়", async () => {
    const result = await decideReturnRequest("req-1", {}, form({ refundAmount: "500" }));

    expect(mocks.updateOrderStatus).toHaveBeenNthCalledWith(1, "sub-1", "RETURNED");
    expect(mocks.updateOrderStatus).toHaveBeenNthCalledWith(2, "sub-1", "REFUNDED");

    expect(mocks.prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        reference: "ref-S-1001",
        type: "REFUND",
        amount: 500,
        method: "INHOUSE",
        status: "COMPLETED",
        description: "Return req-1 — S-1001",
        orderId: "sub-1",
        userId: "u-1",
      },
    });
    expect(mocks.prisma.returnRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: expect.objectContaining({ status: "REFUNDED", refundAmount: 500 }),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/returns");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/orders");
    expect(result.message).toBe("রিটার্ন অনুমোদিত হয়েছে");
  });

  it("প্যারেন্ট পুরো REFUNDED হলে ডাবল রিফান্ড লেজার লেখা হয় না", async () => {
    mocks.prisma.order.findUnique
      .mockResolvedValueOnce({ parentId: "p-1", orderNumber: "S-1001" }) // সাব-অর্ডার লুকআপ
      .mockResolvedValueOnce({ status: "REFUNDED" }); // প্যারেন্ট স্ট্যাটাস

    await decideReturnRequest("req-1", {}, form({ refundAmount: "500" }));

    expect(mocks.updateOrderStatus).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.transaction.create).not.toHaveBeenCalled();
  });

  it("রিফান্ড আইটেম মোটের বেশি হলে এরর", async () => {
    const result = await decideReturnRequest("req-1", {}, form({ refundAmount: "2000" }));

    expect(result.errors?.refundAmount?.[0]).toBe("সর্বোচ্চ ৳1499 রিফান্ড করা যাবে");
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("অবৈধ রিফান্ড সংখ্যায় এরর", async () => {
    const result = await decideReturnRequest("req-1", {}, form({ refundAmount: "abc" }));
    expect(result.errors?.refundAmount?.[0]).toBe("সঠিক রিফান্ড পরিমাণ দিন");
  });

  it("অর্ডার SHIPPED/DELIVERED না হলে প্রসেস হয় না", async () => {
    mocks.prisma.returnRequest.findUnique.mockResolvedValue({
      ...REQUEST,
      order: { orderNumber: "S-1001", status: "PENDING" },
    });
    const result = await decideReturnRequest("req-1", {}, form({ refundAmount: "500" }));

    expect(result.message).toBe("এই অর্ডারের অবস্থায় রিটার্ন প্রসেস করা যায় না");
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
    expect(mocks.prisma.returnRequest.update).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন লগইন পেজে রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-2", role: "SELLER" } });
    await expect(decideReturnRequest("req-1", {}, form())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
  });
});
