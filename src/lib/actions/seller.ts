"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sellerApplicationSchema, productSchema, withdrawalSchema } from "@/lib/validation";
import { slugify, formatBDT } from "@/lib/format";

export type SellerState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// সেলারের প্রতিটি অ্যাকশনে এই চেক চলে: লগইন + APPROVED সেলার প্রোফাইল + শপ
async function requireSeller() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    include: { shop: true },
  });

  if (
    !profile ||
    profile.status !== "APPROVED" ||
    profile.deletedAt != null ||
    !profile.shop ||
    session.user.role !== "SELLER"
  ) {
    redirect("/access-denied");
  }

  return { userId: session.user.id, profile, shop: profile.shop };
}

export async function applyForSeller(
  _prevState: SellerState,
  formData: FormData
): Promise<SellerState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/become-seller");
  const userId = session.user.id;

  const existing = await prisma.sellerProfile.findUnique({
    where: { userId },
    include: { shop: true },
  });

  if (existing?.status === "APPROVED") redirect("/seller");
  if (existing?.status === "PENDING") {
    return { message: "আপনার আবেদন ইতিমধ্যে জমা আছে — অ্যাডমিন অনুমোদনের অপেক্ষায়" };
  }
  if (existing?.status === "SUSPENDED") {
    return {
      errors: { shopName: ["আপনার শপ সাময়িকভাবে স্থগিত আছে — সাপোর্টে যোগাযোগ করুন"] },
    };
  }

  const parsed = sellerApplicationSchema.safeParse({
    shopName: formData.get("shopName"),
    description: formData.get("description"),
    phone: formData.get("phone") || "",
    address: formData.get("address") || "",
    bankName: formData.get("bankName") || "",
    bankAccountName: formData.get("bankAccountName") || "",
    bankAccountNo: formData.get("bankAccountNo") || "",
    bkashNumber: formData.get("bkashNumber") || "",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  const d = parsed.data;
  const slug = slugify(d.shopName);

  const slugTaken = await prisma.shop.findUnique({ where: { slug } });
  if (slugTaken && slugTaken.sellerProfileId !== existing?.id) {
    return { errors: { shopName: ["এই নামে শপ আগে থেকেই আছে — অন্য নাম দিন"] } };
  }

  const bankData = {
    bankName: d.bankName || null,
    bankAccountName: d.bankAccountName || null,
    bankAccountNo: d.bankAccountNo || null,
    bkashNumber: d.bkashNumber || null,
  };
  const address = d.address || null;

  if (existing) {
    // REJECTED আবেদন — আবার আবেদন করলে প্রোফাইল ও শপ আপডেট হয়
    await prisma.$transaction([
      prisma.sellerProfile.update({
        where: { userId },
        data: { status: "PENDING", verifiedAt: null, rejectionReason: null, ...bankData },
      }),
      prisma.shop.update({
        where: { sellerProfileId: existing.id },
        data: { name: d.shopName, slug, description: d.description, address },
      }),
    ]);
  } else {
    await prisma.sellerProfile.create({
      data: {
        userId,
        ...bankData,
        shop: { create: { name: d.shopName, slug, description: d.description, address } },
      },
    });
  }

  if (d.phone) {
    await prisma.user.update({ where: { id: userId }, data: { phone: d.phone } });
  }

  revalidatePath("/become-seller");
  return { message: "আবেদন জমা হয়েছে — অ্যাডমিন অনুমোদন দিলেই সেলার প্যানেল পাবেন" };
}

export async function updateShopSettings(
  _prevState: SellerState,
  formData: FormData
): Promise<SellerState> {
  const { profile, shop } = await requireSeller();

  const parsed = sellerApplicationSchema.pick({
    shopName: true,
    description: true,
    address: true,
    bankName: true,
    bankAccountName: true,
    bankAccountNo: true,
    bkashNumber: true,
  }).safeParse({
    shopName: formData.get("shopName"),
    description: formData.get("description"),
    address: formData.get("address") || "",
    bankName: formData.get("bankName") || "",
    bankAccountName: formData.get("bankAccountName") || "",
    bankAccountNo: formData.get("bankAccountNo") || "",
    bkashNumber: formData.get("bkashNumber") || "",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  const d = parsed.data;
  const slug = slugify(d.shopName);
  const slugTaken = await prisma.shop.findUnique({ where: { slug } });
  if (slugTaken && slugTaken.id !== shop.id) {
    return { errors: { shopName: ["এই নামে শপ আগে থেকেই আছে — অন্য নাম দিন"] } };
  }

  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      name: d.shopName,
      slug,
      description: d.description,
      address: d.address || null,
      logoUrl: (formData.get("logoUrl") as string)?.trim() || null,
      bannerUrl: (formData.get("bannerUrl") as string)?.trim() || null,
    },
  });

  await prisma.sellerProfile.update({
    where: { id: profile.id },
    data: {
      bankName: d.bankName || null,
      bankAccountName: d.bankAccountName || null,
      bankAccountNo: d.bankAccountNo || null,
      bkashNumber: d.bkashNumber || null,
    },
  });

  revalidatePath("/seller");
  revalidatePath("/seller/settings");
  return { message: "শপের তথ্য আপডেট হয়েছে" };
}

// ===== নিজের প্রোডাক্ট ম্যানেজমেন্ট =====
// সেলারের প্রোডাক্ট সবসময় PENDING হয়ে জমা হয় — অ্যাডমিন অনুমোদনের পর সাইটে দেখায়

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice") || "",
    categoryId: formData.get("categoryId"),
    stock: formData.get("stock"),
    imageUrls: formData.get("imageUrls"),
    status: "PENDING",
  });
}

async function uniqueProductSlug(title: string) {
  let slug = slugify(title);
  if (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;
  }
  return slug;
}

export async function createSellerProduct(
  _prevState: SellerState,
  formData: FormData
): Promise<SellerState> {
  const { profile } = await requireSeller();

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  const d = parsed.data;
  const category = await prisma.category.findUnique({ where: { id: d.categoryId } });
  if (!category) {
    return { errors: { categoryId: ["ক্যাটাগরি খুঁজে পাওয়া যায়নি"] } };
  }

  const slug = await uniqueProductSlug(d.title);
  const imageUrls = d.imageUrls
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.product.create({
    data: {
      title: d.title,
      slug,
      description: d.description,
      price: d.price,
      compareAtPrice: typeof d.compareAtPrice === "number" ? d.compareAtPrice : null,
      status: "PENDING",
      isFlashSale: false,
      flashSalePrice: null,
      categoryId: d.categoryId,
      sellerId: profile.id,
      inventory: { create: { stock: d.stock } },
      images: { create: imageUrls.map((url, i) => ({ url, position: i })) },
    },
  });

  revalidatePath("/seller/products");
  return { message: "প্রোডাক্ট জমা হয়েছে — অ্যাডমিন অনুমোদনের পর সাইটে দেখাবে" };
}

export async function updateSellerProduct(
  productId: string,
  _prevState: SellerState,
  formData: FormData
): Promise<SellerState> {
  const { profile } = await requireSeller();

  // Ownership চেক: শুধু নিজের প্রোডাক্ট এডিট করা যায়
  const existing = await prisma.product.findUnique({
    where: { id: productId, sellerId: profile.id },
  });
  if (!existing || existing.deletedAt) {
    return { errors: { title: ["প্রোডাক্ট খুঁজে পাওয়া যায়নি"] } };
  }

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  const d = parsed.data;
  const category = await prisma.category.findUnique({ where: { id: d.categoryId } });
  if (!category) {
    return { errors: { categoryId: ["ক্যাটাগরি খুঁজে পাওয়া যায়নি"] } };
  }

  const slug = d.title === existing.title ? existing.slug : await uniqueProductSlug(d.title);
  const imageUrls = d.imageUrls
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  // এডিটের পর আবার অ্যাডমিন অনুমোদন লাগবে
  await prisma.product.update({
    where: { id: productId },
    data: {
      title: d.title,
      slug,
      description: d.description,
      price: d.price,
      compareAtPrice: typeof d.compareAtPrice === "number" ? d.compareAtPrice : null,
      status: "PENDING",
      categoryId: d.categoryId,
    },
  });

  // বেস ইনভেন্টরি রো (variantId = null) — Prisma-র কম্পাউন্ড unique ইনপুট nullable
  // variantId সাপোর্ট করে না, তাই findFirst দিয়ে id ধরে আপডেট
  const baseInventory = await prisma.inventory.findFirst({
    where: { productId, variantId: null },
  });
  if (baseInventory) {
    await prisma.inventory.update({
      where: { id: baseInventory.id },
      data: { stock: d.stock },
    });
  }

  await prisma.productImage.deleteMany({ where: { productId } });
  await prisma.productImage.createMany({
    data: imageUrls.map((url, i) => ({ url, position: i, productId })),
  });

  revalidatePath("/seller/products");
  revalidatePath(`/seller/products/${productId}/edit`);
  return { message: "প্রোডাক্ট আপডেট হয়েছে — আবার অনুমোদনের অপেক্ষায়" };
}

export async function deleteSellerProduct(productId: string) {
  const { profile } = await requireSeller();

  // Ownership চেক: শুধু নিজের প্রোডাক্ট ডিলিট করা যায়
  const existing = await prisma.product.findUnique({
    where: { id: productId, sellerId: profile.id },
  });
  if (!existing || existing.deletedAt) {
    throw new Error("প্রোডাক্ট খুঁজে পাওয়া যায়নি");
  }

  // Soft delete — পুরোনো অর্ডারের রেফারেন্স অক্ষত থাকে, সাইট থেকে লুকিয়ে যায়
  await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });

  revalidatePath("/seller/products");
  revalidatePath("/");
}

// ===== আয় ও উইথড্র =====

export async function requestWithdrawal(
  _prevState: SellerState,
  formData: FormData
): Promise<SellerState> {
  const { profile } = await requireSeller();

  const parsed = withdrawalSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  const { amount, method } = parsed.data;

  if (method === "BANK" && (!profile.bankAccountNo || !profile.bankName)) {
    return {
      errors: { method: ["ব্যাংক তথ্য দেওয়া নেই — শপ সেটিংসে ব্যাংক তথ্য যোগ করুন"] },
    };
  }
  if (method === "BKASH" && !profile.bkashNumber) {
    return {
      errors: { method: ["বিকাশ নম্বর দেওয়া নেই — শপ সেটিংসে বিকাশ নম্বর যোগ করুন"] },
    };
  }

  const balance = Number(profile.balance);
  if (amount > balance) {
    return {
      errors: {
        amount: [`আপনার ব্যালেন্স ${formatBDT(balance)} — এর বেশি তুলতে পারবেন না`],
      },
    };
  }

  // অনুরোধের সাথে সাথে ব্যালেন্স থেকে রিজার্ভ — বাতিল হলে ফেরত আসে
  await prisma.$transaction([
    prisma.withdrawal.create({
      data: { sellerId: profile.id, amount, method, status: "PENDING" },
    }),
    prisma.sellerProfile.update({
      where: { id: profile.id },
      data: { balance: { decrement: amount } },
    }),
  ]);

  revalidatePath("/seller/earnings");
  return { message: "উইথড্র রিকোয়েস্ট জমা হয়েছে — অ্যাডমিন অনুমোদনের পর টাকা পাঠানো হবে" };
}
