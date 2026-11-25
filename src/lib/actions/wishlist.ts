"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { invalidateCache } from "@/lib/cache";

export async function toggleWishlist(productId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    await prisma.wishlistItem.create({ data: { userId, productId } });
  }

  // ক্যাশড উইশলিস্ট আইডি সাথে সাথে ফাঁকা করি, যাতে কার্ডের হার্ট আইকন
  // পরের রেন্ডারেই সঠিক অবস্থা দেখায়
  invalidateCache("wishlist:");
  revalidatePath("/wishlist");
  revalidatePath(`/products`);
}
