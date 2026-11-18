import { prisma } from "@/lib/prisma";

// রিপোর্ট ডেটা — শুধু প্যারেন্ট অর্ডার থেকে বিক্রি/পেমেন্ট হিসাব হয়,
// ডেলিভারড সাব-অর্ডারের সাবটোটাল থেকে আয় (সাব-অর্ডারে total সবসময় null)
export async function getReportsData() {
  const [
    orderAgg,
    deliveredAgg,
    refundAgg,
    paymentBreakdown,
    statusBreakdown,
    topProductGroups,
    topSellerGroups,
    userCount,
    sellerCount,
    productCount,
    pendingReturnCount,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { parentId: null },
      _sum: { subtotal: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { parentId: null, status: "DELIVERED" },
      _sum: { subtotal: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { type: "REFUND" },
      _sum: { amount: true },
    }),
    prisma.order.groupBy({
      by: ["paymentMethod"],
      where: { parentId: null },
      _count: { _all: true },
      _sum: { subtotal: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { parentId: null },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    prisma.order.groupBy({
      by: ["sellerId"],
      where: { parentId: { not: null } },
      _sum: { subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 10,
    }),
    prisma.user.count(),
    prisma.sellerProfile.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.returnRequest.count({ where: { status: "REQUESTED" } }),
  ]);

  const productIds = topProductGroups.map((g) => g.productId);
  const sellerIds = topSellerGroups
    .map((g) => g.sellerId)
    .filter((id): id is string => id !== null);

  const [products, sellers] = await Promise.all([
    productIds.length
      ? prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    sellerIds.length
      ? prisma.sellerProfile.findMany({
          where: { id: { in: sellerIds } },
          select: { id: true, shop: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const productTitle = new Map(products.map((p) => [p.id, p.title]));
  const shopName = new Map(sellers.map((s) => [s.id, s.shop?.name ?? "—"]));

  return {
    totalOrders: orderAgg._count,
    totalSales: Number(orderAgg._sum.subtotal ?? 0),
    deliveredOrders: deliveredAgg._count,
    deliveredRevenue: Number(deliveredAgg._sum.subtotal ?? 0),
    refundTotal: Number(refundAgg._sum.amount ?? 0),
    paymentBreakdown: paymentBreakdown.map((p) => ({
      method: p.paymentMethod ?? "UNKNOWN",
      count: p._count._all,
      amount: Number(p._sum.subtotal ?? 0),
    })),
    statusBreakdown: statusBreakdown.map((s) => ({
      status: s.status,
      count: s._count._all,
    })),
    topProducts: topProductGroups.map((g) => ({
      productId: g.productId,
      title: productTitle.get(g.productId) ?? "—",
      quantity: g._sum.quantity ?? 0,
    })),
    topSellers: topSellerGroups.map((g) => ({
      sellerId: g.sellerId,
      shop: g.sellerId ? (shopName.get(g.sellerId) ?? "—") : "ShopDesh (প্ল্যাটফর্ম)",
      amount: Number(g._sum.subtotal ?? 0),
    })),
    userCount,
    sellerCount,
    productCount,
    pendingReturnCount,
  };
}
