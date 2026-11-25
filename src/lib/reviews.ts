import { prisma } from "@/lib/prisma";

export const REVIEW_NOT_DELIVERED_MESSAGE =
  "রিভিউ দিতে হলে প্রোডাক্টটি কিনে হাতে পাওয়ার পরে (অর্ডার ডেলিভারড হলে) রিভিউ দিতে পারবেন।";

// ইউজারের কোনো ডেলিভারি হওয়া (DELIVERED) অর্ডারে এই প্রোডাক্টটি থাকলে তবেই রিভিউ
export async function hasDeliveredPurchase(userId: string, productId: string) {
  const item = await prisma.orderItem.findFirst({
    where: { productId, order: { userId, status: "DELIVERED" } },
    select: { id: true },
  });
  return item !== null;
}
