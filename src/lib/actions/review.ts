"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validation";

export type ReviewState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function submitReview(
  productId: string,
  _prevState: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "রেটিং দিন",
    };
  }

  const userId = session.user.id;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return { message: "প্রোডাক্টটি পাওয়া যায়নি" };
  }

  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    await prisma.review.update({
      where: { id: existing.id },
      data: { rating: parsed.data.rating, comment: parsed.data.comment || null },
    });
  } else {
    await prisma.review.create({
      data: {
        userId,
        productId,
        rating: parsed.data.rating,
        comment: parsed.data.comment || null,
      },
    });
  }

  const agg = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAvg: agg._avg.rating ?? 0,
      ratingCount: agg._count.rating,
    },
  });

  revalidatePath(`/products/${product.slug}`);
  return { message: "রিভিউ সফলভাবে জমা হয়েছে" };
}
