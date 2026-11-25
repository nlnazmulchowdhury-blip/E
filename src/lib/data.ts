import { prisma } from "@/lib/prisma";
import { CACHE_TTL, cached } from "@/lib/cache";

const IMAGES = { images: { orderBy: { position: "asc" as const } } };
const INVENTORY = { inventory: true };

// হেডার, মোবাইল নেভ, হোম, সার্চ — সবাই একই ক্যাটাগরি লিস্ট চায়। Workers-এ
// প্রতিটি কুয়েরির জন্য নতুন কানেকশন লাগে, তাই কয়েক সেকেন্ডের জন্য ক্যাশ করি।
export async function getCategories() {
  return cached("categories", CACHE_TTL, () =>
    prisma.category.findMany({
      include: { _count: { select: { products: { where: { status: "APPROVED", deletedAt: null } } } } },
      orderBy: { name: "asc" },
    })
  );
}

export async function getFlashSaleProducts() {
  return prisma.product.findMany({
    where: {
      status: "APPROVED",
      deletedAt: null,
      isFlashSale: true,
      inventory: { some: { stock: { gt: 0 } } },
    },
    include: { ...IMAGES, ...INVENTORY, category: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
}

export async function getNewArrivals() {
  return prisma.product.findMany({
    where: { status: "APPROVED", deletedAt: null },
    include: { ...IMAGES, ...INVENTORY, category: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
}

export async function getBestRatedProducts() {
  return prisma.product.findMany({
    where: { status: "APPROVED", deletedAt: null, ratingCount: { gt: 0 } },
    include: { ...IMAGES, ...INVENTORY, category: true },
    take: 10,
    orderBy: { ratingAvg: "desc" },
  });
}

export async function getProductsByCategory(slug: string, page = 1) {
  const pageSize = 12;
  const where = {
    status: "APPROVED" as const,
    deletedAt: null,
    category: { slug },
  };
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { ...IMAGES, ...INVENTORY, category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { products, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function searchProducts(params: {
  q?: string;
  category?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
}) {
  const pageSize = 12;
  const page = params.page ?? 1;
  const where = {
    status: "APPROVED" as const,
    deletedAt: null,
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: "insensitive" as const } },
            { description: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.category ? { category: { slug: params.category } } : {}),
    ...(params.minPrice !== undefined || params.maxPrice !== undefined
      ? {
          price: {
            ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
            ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
          },
        }
      : {}),
    ...(params.inStock ? { inventory: { some: { stock: { gt: 0 } } } } : {}),
  };

  const orderBy =
    params.sort === "price-asc"
      ? ({ price: "asc" } as const)
      : params.sort === "price-desc"
        ? ({ price: "desc" } as const)
        : params.sort === "rating"
          ? ({ ratingAvg: "desc" } as const)
          : ({ createdAt: "desc" } as const);

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { ...IMAGES, ...INVENTORY, category: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { products, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      inventory: true,
      category: true,
      seller: { include: { shop: true } },
      reviews: {
        include: { user: { select: { name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function getRelatedProducts(categoryId: string, excludeId: string) {
  return prisma.product.findMany({
    where: {
      status: "APPROVED",
      deletedAt: null,
      categoryId,
      id: { not: excludeId },
      inventory: { some: { stock: { gt: 0 } } },
    },
    include: { ...IMAGES, ...INVENTORY },
    take: 4,
    orderBy: { ratingAvg: "desc" },
  });
}

export async function getCart(userId: string) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: { include: { images: { orderBy: { position: "asc" } }, inventory: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCartCount(userId: string) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    select: { quantity: true },
  });
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export async function getWishlist(userId: string) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      product: { include: { images: { orderBy: { position: "asc" } }, inventory: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// প্রোডাক্ট কার্ড যখন লগইন করা ইউজারের জন্য রেন্ডার হয়, তখন প্রতিটি কার্ড
// আলাদা কুয়েরি করলে এক পেজেই ৩০টি কানেকশন খুলে যায়। তাই এক কুয়েরিতেই সব
// প্রোডাক্ট আইডি এনে ক্যাশ করি (১০ সেকেন্ড) — উইশলিস্ট বদলালে দ্রুত রিফ্রেশ হয়।
export async function getWishlistedProductIds(
  userId: string
): Promise<ReadonlySet<string>> {
  return cached(`wishlist:${userId}`, 10_000, async () => {
    const rows = await prisma.wishlistItem.findMany({
      where: { userId },
      select: { productId: true },
    });
    return new Set(rows.map((row) => row.productId));
  });
}

export async function getUserAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function getOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId, parentId: null },
    include: {
      subOrders: {
        include: {
          items: { include: { product: { include: { images: { orderBy: { position: "asc" } } } } } },
          shipment: true,
          seller: { include: { shop: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderById(userId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      subOrders: {
        include: {
          items: { include: { product: { include: { images: { orderBy: { position: "asc" } } } } } },
          shipment: true,
          seller: { include: { shop: true } },
          statusHistory: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "asc" },
      },
      statusHistory: { orderBy: { createdAt: "desc" } },
      payment: true,
    },
  });
}

export async function getPendingProducts() {
  return prisma.product.findMany({
    where: { status: "PENDING", deletedAt: null },
    include: { category: true, images: { orderBy: { position: "asc" } }, inventory: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getActiveBanners() {
  return cached("banners", CACHE_TTL, () =>
    prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ position: "asc" }, { sortOrder: "asc" }],
    })
  );
}

export async function getAdminStats() {
  const [customers, sellers, products, orders, pendingProducts, revenue] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "SELLER" } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.order.count(),
    prisma.product.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { paymentStatus: "PAID", parentId: null },
    }),
  ]);
  return { customers, sellers, products, orders, pendingProducts, revenue: revenue._sum.total ?? 0 };
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getShopBySlug(slug: string) {
  return prisma.shop.findUnique({
    where: { slug },
    include: {
      sellerProfile: {
        include: {
          _count: {
            select: { products: { where: { status: "APPROVED", deletedAt: null } } },
          },
        },
      },
    },
  });
}

export async function getShopProducts(sellerProfileId: string) {
  return prisma.product.findMany({
    where: { sellerId: sellerProfileId, status: "APPROVED", deletedAt: null },
    include: { ...IMAGES, ...INVENTORY, category: true },
    orderBy: { createdAt: "desc" },
  });
}
