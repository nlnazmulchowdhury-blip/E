import { describe, it, expect, vi, beforeEach } from "vitest";
import { getReportsData } from "./reports";

const mocks = vi.hoisted(() => ({
  prisma: {
    order: { aggregate: vi.fn(), groupBy: vi.fn() },
    orderItem: { groupBy: vi.fn() },
    transaction: { aggregate: vi.fn() },
    user: { count: vi.fn() },
    sellerProfile: { count: vi.fn(), findMany: vi.fn() },
    product: { count: vi.fn(), findMany: vi.fn() },
    returnRequest: { count: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

beforeEach(() => {
  vi.clearAllMocks();

  mocks.prisma.order.aggregate
    .mockResolvedValueOnce({ _sum: { subtotal: 11444 }, _count: 5 }) // সব প্যারেন্ট
    .mockResolvedValueOnce({ _sum: { subtotal: 7147 }, _count: 2 }); // DELIVERED
  mocks.prisma.transaction.aggregate.mockResolvedValue({
    _sum: { amount: 1000 },
  });
  mocks.prisma.order.groupBy
    .mockResolvedValueOnce([
      { paymentMethod: "COD", _count: { _all: 4 }, _sum: { subtotal: 9945 } },
      { paymentMethod: "BKASH", _count: { _all: 1 }, _sum: { subtotal: 1499 } },
    ])
    .mockResolvedValueOnce([
      { status: "DELIVERED", _count: { _all: 2 } },
      { status: "PENDING", _count: { _all: 1 } },
      { status: "CANCELLED", _count: { _all: 2 } },
    ])
    .mockResolvedValueOnce([
      { sellerId: "sp-1", _sum: { subtotal: 3498 } },
      { sellerId: null, _sum: { subtotal: 2149 } },
    ]);
  mocks.prisma.orderItem.groupBy.mockResolvedValue([
    { productId: "p-1", _sum: { quantity: 12 } },
    { productId: "p-2", _sum: { quantity: 7 } },
  ]);
  mocks.prisma.user.count.mockResolvedValue(4);
  mocks.prisma.sellerProfile.count.mockResolvedValue(1);
  mocks.prisma.product.count.mockResolvedValue(8);
  mocks.prisma.returnRequest.count.mockResolvedValue(0);
  mocks.prisma.product.findMany.mockResolvedValue([
    { id: "p-1", title: "Cotton Panjabi" },
    { id: "p-2", title: "Hair Oil" },
  ]);
  mocks.prisma.sellerProfile.findMany.mockResolvedValue([
    { id: "sp-1", shop: { name: "Demo Store" } },
  ]);
});

describe("getReportsData", () => {
  it("সারসংক্ষেপ, পেমেন্ট ও স্ট্যাটাস ব্রেকডাউন ফেরত দেয়", async () => {
    const r = await getReportsData();

    expect(r.totalOrders).toBe(5);
    expect(r.totalSales).toBe(11444);
    expect(r.deliveredOrders).toBe(2);
    expect(r.deliveredRevenue).toBe(7147);
    expect(r.refundTotal).toBe(1000);
    expect(r.userCount).toBe(4);
    expect(r.sellerCount).toBe(1);
    expect(r.productCount).toBe(8);
    expect(r.pendingReturnCount).toBe(0);

    expect(r.paymentBreakdown).toEqual([
      { method: "COD", count: 4, amount: 9945 },
      { method: "BKASH", count: 1, amount: 1499 },
    ]);
    expect(r.statusBreakdown).toEqual([
      { status: "DELIVERED", count: 2 },
      { status: "PENDING", count: 1 },
      { status: "CANCELLED", count: 2 },
    ]);
  });

  it("টপ প্রোডাক্টে শিরোনাম ও পরিমাণ মিলিয়ে দেয়", async () => {
    const r = await getReportsData();
    expect(r.topProducts).toEqual([
      { productId: "p-1", title: "Cotton Panjabi", quantity: 12 },
      { productId: "p-2", title: "Hair Oil", quantity: 7 },
    ]);
  });

  it("টপ সেলারে শপ নাম বসায়; প্ল্যাটফর্ম সেল (sellerId null) লেবেল পায়", async () => {
    const r = await getReportsData();
    expect(r.topSellers).toEqual([
      { sellerId: "sp-1", shop: "Demo Store", amount: 3498 },
      { sellerId: null, shop: "TemoBay (প্ল্যাটফর্ম)", amount: 2149 },
    ]);
  });

  it("প্রোডাক্ট/সেলার খালি থাকলে findMany ডাকা হয় না", async () => {
    mocks.prisma.orderItem.groupBy.mockResolvedValue([]);
    mocks.prisma.order.groupBy.mockReset();
    mocks.prisma.order.groupBy
      .mockResolvedValueOnce([
        { paymentMethod: "COD", _count: { _all: 4 }, _sum: { subtotal: 9945 } },
      ])
      .mockResolvedValueOnce([{ status: "DELIVERED", _count: { _all: 2 } }])
      .mockResolvedValueOnce([]);

    const r = await getReportsData();
    expect(r.topProducts).toEqual([]);
    expect(r.topSellers).toEqual([]);
    expect(mocks.prisma.product.findMany).not.toHaveBeenCalled();
    expect(mocks.prisma.sellerProfile.findMany).not.toHaveBeenCalled();
  });

  it("ডেলিভারড আয় শুধু DELIVERED প্যারেন্ট থেকে হয়", async () => {
    await getReportsData();
    const aggregateCalls = mocks.prisma.order.aggregate.mock.calls;
    expect(aggregateCalls[1][0].where).toEqual({
      parentId: null,
      status: "DELIVERED",
    });
  });
});
