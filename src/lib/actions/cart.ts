"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stockOf } from "@/lib/inventory";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}

async function getStock(productId: string, variantId: string | null = null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { inventory: true },
  });
  if (!product) return 0;
  return stockOf(product.inventory, variantId);
}

export type AddToCartResult = { added: boolean; alreadyInCart: boolean };

// একই প্রোডাক্ট আগে থেকে কার্টে থাকলে আরেকবার যোগ হয় না — শুধু জানিয়ে দিই।
// পরিমাণ বদলাতে চাইলে কার্টের +/- বাটন ব্যবহার করতে হয়।
export async function addToCart(
  productId: string,
  quantity = 1,
  variantId: string | null = null
): Promise<AddToCartResult> {
  const userId = await requireUser();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { inventory: true },
  });
  if (!product || product.status !== "APPROVED" || product.deletedAt) {
    throw new Error("প্রোডাক্টটি পাওয়া যায়নি");
  }
  const stock = stockOf(product.inventory, variantId);
  if (stock < quantity) {
    throw new Error("পর্যাপ্ত স্টক নেই");
  }

  const existing = await prisma.cartItem.findFirst({
    where: { userId, productId, variantId },
  });

  if (existing) {
    return { added: false, alreadyInCart: true };
  }

  await prisma.cartItem.create({
    data: { userId, productId, variantId, quantity: Math.min(quantity, stock) },
  });

  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return { added: true, alreadyInCart: false };
}

export async function updateCartQuantity(
  productId: string,
  quantity: number,
  variantId: string | null = null
) {
  const userId = await requireUser();

  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({ where: { userId, productId, variantId } });
  } else {
    const maxQty = await getStock(productId, variantId);
    await prisma.cartItem.updateMany({
      where: { userId, productId, variantId },
      data: { quantity: Math.min(quantity, maxQty) },
    });
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeFromCart(productId: string, variantId: string | null = null) {
  const userId = await requireUser();
  await prisma.cartItem.deleteMany({ where: { userId, productId, variantId } });
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}
