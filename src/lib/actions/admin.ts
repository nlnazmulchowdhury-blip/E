"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { categorySchema, productSchema, couponSchema, bannerSchema, siteSettingsSchema, staffSchema, staffPermissionsSchema } from "@/lib/validation";
import { slugify, formatBDT } from "@/lib/format";
import { COMMISSION_SETTING_KEY, SITE_SETTING_KEYS } from "@/lib/site-settings";
import { updateOrderStatus } from "@/lib/actions/orders";
import { type OrderStatus } from "@/lib/order-status";
import { requireAdminOrStaff } from "@/lib/permissions";
import { type StaffPermission } from "@/lib/staff-permissions";
import { z } from "zod";

export type AdminState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// perm দিলে STAFF-এর সেই পারমিশন লাগবে; না দিলে শুধু ADMIN
async function requireAdmin(perm?: StaffPermission) {
  return requireAdminOrStaff(perm);
}

// অ্যাডমিনের প্রতিটি কার্যক্রম AuditLog-এ জমা থাকে
async function logAudit(
  adminId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: unknown
) {
  await prisma.auditLog.create({
    data: { adminId, action, entity, entityId: entityId ?? null, details: (details as object) ?? undefined },
  });
}

export async function createCategory(
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin("categories");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    parentId: formData.get("parentId"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  const { name, description, parentId } = parsed.data;
  const slug = slugify(name);

  const exists = await prisma.category.findUnique({ where: { slug } });
  if (exists) {
    return { errors: { name: ["এই নামে ক্যাটাগরি আগে থেকেই আছে"] } };
  }

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      description: description || null,
      parentId: parentId || null,
    },
  });

  await logAudit(adminId, "CREATE", "CATEGORY", category.id, { name, slug });

  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { message: "ক্যাটাগরি তৈরি হয়েছে" };
}

export async function deleteCategory(id: string) {
  const adminId = await requireAdmin("categories");

  const childCount = await prisma.category.count({ where: { parentId: id } });
  if (childCount > 0) {
    throw new Error("প্রথমে সাব-ক্যাটাগরিগুলো মুছুন");
  }

  await prisma.category.delete({ where: { id } });
  await logAudit(adminId, "DELETE", "CATEGORY", id);

  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function approveProduct(id: string) {
  const adminId = await requireAdmin("products");
  await prisma.product.update({
    where: { id },
    data: { status: "APPROVED" },
  });
  await logAudit(adminId, "APPROVE", "PRODUCT", id);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function rejectProduct(id: string) {
  const adminId = await requireAdmin("products");
  await prisma.product.update({
    where: { id },
    data: { status: "REJECTED" },
  });
  await logAudit(adminId, "REJECT", "PRODUCT", id);
  revalidatePath("/admin/products");
}

export async function setProductStatus(id: string, status: "APPROVED" | "REJECTED" | "INACTIVE") {
  const adminId = await requireAdmin("products");
  await prisma.product.update({ where: { id }, data: { status } });
  await logAudit(adminId, "STATUS_CHANGE", "PRODUCT", id, { status });
  revalidatePath("/admin/products");
}

// ===== সেলার ম্যানেজমেন্ট =====

async function notifySeller(userId: string, title: string, message: string) {
  await prisma.notification.create({ data: { userId, title, message } });
}

export async function approveSeller(id: string) {
  const adminId = await requireAdmin("sellers");
  const profile = await prisma.sellerProfile.findUnique({
    where: { id },
    include: { shop: true },
  });
  if (!profile) throw new Error("সেলার খুঁজে পাওয়া যায়নি");

  // নতুন সেলার গ্লোবাল ডিফল্ট কমিশন হারে শুরু করে
  const setting = await prisma.siteSetting.findUnique({
    where: { key: COMMISSION_SETTING_KEY },
  });
  const defaultRate =
    typeof setting?.value === "number" ? Number(setting.value) : 5;

  // অনুমোদন মানে: প্রোফাইল APPROVED + ইউজারের রোল SELLER
  await prisma.$transaction([
    prisma.sellerProfile.update({
      where: { id },
      data: { status: "APPROVED", verifiedAt: new Date(), commissionRate: defaultRate },
    }),
    prisma.user.update({ where: { id: profile.userId }, data: { role: "SELLER" } }),
  ]);

  await logAudit(adminId, "APPROVE", "SELLER", id, { shopName: profile.shop?.name });
  await notifySeller(
    profile.userId,
    "শপ অনুমোদিত হয়েছে",
    `আপনার শপ "${profile.shop?.name ?? "নতুন শপ"}" অনুমোদিত হয়েছে — এখন সেলার প্যানেল থেকে প্রোডাক্ট যোগ করতে পারবেন।`
  );
  revalidatePath("/admin/sellers");
}

export async function rejectSeller(id: string, reason: string) {
  const adminId = await requireAdmin("sellers");
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 5) throw new Error("বাতিলের কারণ দিন (কমপক্ষে ৫ অক্ষর)");
  if (trimmedReason.length > 500) throw new Error("বাতিলের কারণ সর্বোচ্চ ৫০০ অক্ষর হতে পারবে");

  const profile = await prisma.sellerProfile.findUnique({ where: { id } });
  if (!profile) throw new Error("সেলার খুঁজে পাওয়া যায়নি");

  await prisma.sellerProfile.update({
    where: { id },
    data: { status: "REJECTED", rejectionReason: trimmedReason },
  });
  await logAudit(adminId, "REJECT", "SELLER", id, { reason: trimmedReason });
  await notifySeller(
    profile.userId,
    "শপের আবেদন বাতিল হয়েছে",
    `দুঃখিত, আপনার শপের আবেদনটি বাতিল করা হয়েছে। কারণ: ${trimmedReason} তথ্য ঠিক করে আবার আবেদন করতে পারবেন।`
  );
  revalidatePath("/admin/sellers");
}

export async function suspendSeller(id: string) {
  const adminId = await requireAdmin("sellers");
  const profile = await prisma.sellerProfile.findUnique({ where: { id } });
  if (!profile) throw new Error("সেলার খুঁজে পাওয়া যায়নি");

  await prisma.sellerProfile.update({ where: { id }, data: { status: "SUSPENDED" } });
  await logAudit(adminId, "STATUS_CHANGE", "SELLER", id, { status: "SUSPENDED" });
  await notifySeller(
    profile.userId,
    "শপ সাময়িকভাবে স্থগিত",
    "আপনার শপ সাময়িকভাবে স্থগিত করা হয়েছে। বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।"
  );
  revalidatePath("/admin/sellers");
}

export async function reactivateSeller(id: string) {
  const adminId = await requireAdmin("sellers");
  const profile = await prisma.sellerProfile.findUnique({ where: { id } });
  if (!profile) throw new Error("সেলার খুঁজে পাওয়া যায়নি");

  await prisma.$transaction([
    prisma.sellerProfile.update({
      where: { id },
      data: { status: "APPROVED", verifiedAt: new Date(), deletedAt: null },
    }),
    prisma.user.update({ where: { id: profile.userId }, data: { role: "SELLER" } }),
  ]);

  await logAudit(adminId, "STATUS_CHANGE", "SELLER", id, { status: "APPROVED" });
  await notifySeller(
    profile.userId,
    "শপ পুনরায় চালু হয়েছে",
    "আপনার শপ আবার সক্রিয় করা হয়েছে — সেলার প্যানেলে স্বাগতম।"
  );
  revalidatePath("/admin/sellers");
}

// Soft delete — অর্ডার/লেনদেন/কমিশন রেকর্ড অক্ষত থাকে, শুধু সেলার প্যানেল বন্ধ হয়
export async function deleteSeller(id: string) {
  const adminId = await requireAdmin("sellers");
  const profile = await prisma.sellerProfile.findUnique({
    where: { id },
    include: { shop: true },
  });
  if (!profile) throw new Error("সেলার খুঁজে পাওয়া যায়নি");
  if (profile.deletedAt) throw new Error("এই সেলার ইতিমধ্যে ডিলিট করা হয়েছে");

  await prisma.sellerProfile.update({
    where: { id },
    data: { deletedAt: new Date(), status: "SUSPENDED" },
  });

  await logAudit(adminId, "DELETE", "SELLER", id, {
    shopName: profile.shop?.name,
    softDelete: true,
  });
  revalidatePath("/admin/sellers");
}

// ===== কাস্টমার ম্যানেজমেন্ট =====

export async function suspendCustomer(id: string) {
  const adminId = await requireAdmin("customers");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("কাস্টমার খুঁজে পাওয়া যায়নি");

  await prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } });
  await logAudit(adminId, "STATUS_CHANGE", "CUSTOMER", id, { status: "SUSPENDED" });
  revalidatePath("/admin/customers");
}

export async function reactivateCustomer(id: string) {
  const adminId = await requireAdmin("customers");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("কাস্টমার খুঁজে পাওয়া যায়নি");

  await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
  await logAudit(adminId, "STATUS_CHANGE", "CUSTOMER", id, { status: "ACTIVE" });
  revalidatePath("/admin/customers");
}

// ===== উইথড্র ম্যানেজমেন্ট =====

export async function approveWithdrawal(id: string) {
  const adminId = await requireAdmin("withdrawals");
  const w = await prisma.withdrawal.findUnique({ where: { id } });
  if (!w) throw new Error("উইথড্র রিকোয়েস্ট খুঁজে পাওয়া যায়নি");
  if (w.status !== "PENDING") throw new Error("এই রিকোয়েস্ট ইতিমধ্যে প্রসেস করা হয়েছে");

  await prisma.$transaction([
    prisma.withdrawal.update({
      where: { id },
      data: { status: "PAID", processedAt: new Date() },
    }),
    prisma.transaction.create({
      data: {
        reference: `wdr-${id}`,
        type: "WITHDRAWAL",
        amount: Number(w.amount),
        method: w.method,
        status: "COMPLETED",
        description: "সেলার পেআউট",
        sellerId: w.sellerId,
      },
    }),
  ]);

  await logAudit(adminId, "APPROVE", "WITHDRAWAL", id, { amount: Number(w.amount) });
  revalidatePath("/admin/withdrawals");
}

export async function rejectWithdrawal(id: string) {
  const adminId = await requireAdmin("withdrawals");
  const w = await prisma.withdrawal.findUnique({ where: { id } });
  if (!w) throw new Error("উইথড্র রিকোয়েস্ট খুঁজে পাওয়া যায়নি");
  if (w.status !== "PENDING") throw new Error("এই রিকোয়েস্ট ইতিমধ্যে প্রসেস করা হয়েছে");

  // বাতিল হলে রিজার্ভ করা টাকা সেলারের ব্যালেন্সে ফেরত যায়
  await prisma.$transaction([
    prisma.withdrawal.update({
      where: { id },
      data: { status: "REJECTED", processedAt: new Date() },
    }),
    prisma.sellerProfile.update({
      where: { id: w.sellerId },
      data: { balance: { increment: Number(w.amount) } },
    }),
  ]);

  await logAudit(adminId, "REJECT", "WITHDRAWAL", id, { amount: Number(w.amount) });
  revalidatePath("/admin/withdrawals");
}

export async function createProduct(
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin("products");

  const parsed = productSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice") || "",
    categoryId: formData.get("categoryId"),
    stock: formData.get("stock"),
    imageUrls: formData.get("imageUrls"),
    isFlashSale: formData.get("isFlashSale") || undefined,
    flashSalePrice: formData.get("flashSalePrice") || "",
    status: formData.get("status") ?? "APPROVED",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  const d = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: d.categoryId } });
  if (!category) {
    return { errors: { categoryId: ["ক্যাটাগরি খুঁজে পাওয়া যায়নি"] } };
  }

  let slug = slugify(d.title);
  if (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;
  }

  const imageUrls = d.imageUrls
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const product = await prisma.product.create({
    data: {
      title: d.title,
      slug,
      description: d.description,
      price: d.price,
      compareAtPrice: typeof d.compareAtPrice === "number" ? d.compareAtPrice : null,
      status: d.status,
      isFlashSale: !!d.isFlashSale,
      flashSalePrice:
        d.isFlashSale && typeof d.flashSalePrice === "number" ? d.flashSalePrice : null,
      categoryId: d.categoryId,
      sellerId: null,
      inventory: { create: { stock: d.stock } },
      images: { create: imageUrls.map((url, i) => ({ url, position: i })) },
    },
  });

  await logAudit(adminId, "CREATE", "PRODUCT", product.id, { title: d.title, slug });

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath(`/categories/${category.slug}`);
  return { message: "প্রোডাক্ট তৈরি হয়েছে" };
}

export async function updateProduct(
  id: string,
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin("products");

  const parsed = productSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice") || "",
    categoryId: formData.get("categoryId"),
    stock: formData.get("stock"),
    imageUrls: formData.get("imageUrls"),
    isFlashSale: formData.get("isFlashSale") || undefined,
    flashSalePrice: formData.get("flashSalePrice") || "",
    status: formData.get("status") ?? "APPROVED",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  const d = parsed.data;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return { errors: { title: ["প্রোডাক্ট খুঁজে পাওয়া যায়নি"] } };
  }

  const category = await prisma.category.findUnique({ where: { id: d.categoryId } });
  if (!category) {
    return { errors: { categoryId: ["ক্যাটাগরি খুঁজে পাওয়া যায়নি"] } };
  }

  let slug = existing.slug;
  if (d.title !== existing.title) {
    slug = slugify(d.title);
    const slugTaken = await prisma.product.findFirst({
      where: { slug, id: { not: id } },
    });
    if (slugTaken) {
      slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;
    }
  }

  const imageUrls = d.imageUrls
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.product.update({
    where: { id },
    data: {
      title: d.title,
      slug,
      description: d.description,
      price: d.price,
      compareAtPrice: typeof d.compareAtPrice === "number" ? d.compareAtPrice : null,
      status: d.status,
      isFlashSale: !!d.isFlashSale,
      flashSalePrice:
        d.isFlashSale && typeof d.flashSalePrice === "number" ? d.flashSalePrice : null,
      categoryId: d.categoryId,
    },
  });

  // বেস ইনভেন্টরি রো (variantId = null) — findFirst দিয়ে id ধরে আপডেট
  const baseInventory = await prisma.inventory.findFirst({
    where: { productId: id, variantId: null },
  });
  if (baseInventory) {
    await prisma.inventory.update({
      where: { id: baseInventory.id },
      data: { stock: d.stock },
    });
  }

  await prisma.productImage.deleteMany({ where: { productId: id } });
  await prisma.productImage.createMany({
    data: imageUrls.map((url, i) => ({ url, position: i, productId: id })),
  });

  await logAudit(adminId, "UPDATE", "PRODUCT", id, { title: d.title, slug });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}/edit`);
  revalidatePath("/");
  revalidatePath(`/categories/${category.slug}`);
  return { message: "প্রোডাক্ট আপডেট হয়েছে" };
}

export async function deleteProduct(id: string) {
  const adminId = await requireAdmin("products");

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new Error("প্রোডাক্ট খুঁজে পাওয়া যায়নি");
  }

  // সফট ডিলিট — পুরোনো অর্ডারের হিস্ট্রি/আর্থিক রেকর্ড অক্ষত থাকে
  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });
  await logAudit(adminId, "DELETE", "PRODUCT", id, { title: existing.title });

  revalidatePath("/admin/products");
  revalidatePath("/");
}

// ===== কুপন ম্যানেজমেন্ট =====

type CouponInput = z.infer<typeof couponSchema>;

function parseCoupon(formData: FormData) {
  return couponSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    minOrderAmount: formData.get("minOrderAmount"),
    maxUses: formData.get("maxUses"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    isActive: formData.get("isActive"),
  });
}

function toCouponData(d: CouponInput) {
  return {
    code: d.code.toUpperCase(),
    type: d.type,
    value: d.value,
    minOrderAmount: d.minOrderAmount ?? null,
    maxUses: d.maxUses ?? null,
    startsAt: d.startsAt ? new Date(d.startsAt) : null,
    endsAt: d.endsAt ? new Date(d.endsAt) : null,
    isActive: d.isActive === "on",
  };
}

function isUniqueViolation(e: unknown) {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

export async function createCoupon(
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin("coupons");

  const parsed = parseCoupon(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  try {
    const coupon = await prisma.coupon.create({ data: toCouponData(parsed.data) });
    await logAudit(adminId, "CREATE", "COUPON", coupon.id, { code: coupon.code });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { errors: { code: ["এই কোডের কুপন আগে থেকেই আছে"] } };
    }
    throw e;
  }

  revalidatePath("/admin/coupons");
  return { message: "কুপন তৈরি হয়েছে" };
}

export async function updateCoupon(
  id: string,
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin("coupons");

  const parsed = parseCoupon(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  try {
    const coupon = await prisma.coupon.update({
      where: { id },
      data: toCouponData(parsed.data),
    });
    await logAudit(adminId, "UPDATE", "COUPON", coupon.id, { code: coupon.code });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { errors: { code: ["এই কোডের কুপন আগে থেকেই আছে"] } };
    }
    throw e;
  }

  revalidatePath("/admin/coupons");
  return { message: "কুপন আপডেট হয়েছে" };
}

export async function toggleCoupon(id: string) {
  const adminId = await requireAdmin("coupons");
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new Error("কুপন খুঁজে পাওয়া যায়নি");

  const isActive = !coupon.isActive;
  await prisma.coupon.update({ where: { id }, data: { isActive } });
  await logAudit(adminId, "STATUS_CHANGE", "COUPON", id, { isActive });
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(id: string) {
  const adminId = await requireAdmin("coupons");
  // Order.couponCode স্ট্রিং-স্ন্যাপশট — কুপন মুছলে পুরোনো অর্ডার অক্ষত থাকে
  await prisma.coupon.delete({ where: { id } });
  await logAudit(adminId, "DELETE", "COUPON", id);
  revalidatePath("/admin/coupons");
}

// ===== কমিশন ও পেআউট নিয়ন্ত্রণ =====

const commissionRateSchema = z
  .number({ message: "সঠিক হার দিন" })
  .min(0, "হার ০-এর কম হতে পারে না")
  .max(100, "হার ১০০-এর বেশি হতে পারে না");

function parseRate(v: FormDataEntryValue | null) {
  const num = Number(v);
  return commissionRateSchema.safeParse(num);
}

// গ্লোবাল ডিফল্ট কমিশন — নতুন অনুমোদিত সেলারে এই হার প্রযোজ্য হয়
export async function updateDefaultCommission(
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin("commission");
  const parsed = parseRate(formData.get("rate"));
  if (!parsed.success) {
    return {
      errors: { rate: parsed.error.issues.map((i) => i.message) },
      message: "ফর্মে ভুল আছে",
    };
  }

  await prisma.siteSetting.upsert({
    where: { key: COMMISSION_SETTING_KEY },
    update: { value: parsed.data },
    create: { key: COMMISSION_SETTING_KEY, value: parsed.data },
  });
  await logAudit(adminId, "UPDATE", "SETTING", COMMISSION_SETTING_KEY, {
    rate: parsed.data,
  });

  revalidatePath("/admin/commission");
  return { message: "ডিফল্ট কমিশন হার আপডেট হয়েছে" };
}

export async function updateCommissionRate(
  sellerId: string,
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin("commission");
  const parsed = parseRate(formData.get("rate"));
  if (!parsed.success) {
    return {
      errors: { rate: parsed.error.issues.map((i) => i.message) },
      message: "ফর্মে ভুল আছে",
    };
  }

  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) {
    return { message: "সেলার খুঁজে পাওয়া যায়নি" };
  }

  await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: { commissionRate: parsed.data },
  });
  await logAudit(adminId, "UPDATE", "COMMISSION", sellerId, {
    rate: parsed.data,
  });

  revalidatePath("/admin/commission");
  return { message: "কমিশন হার আপডেট হয়েছে" };
}

// ===== ডেলিভারি (শিপমেন্ট) নিয়ন্ত্রণ =====

const SHIPMENT_STATUSES = ["PENDING", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "RETURNED"];
const SHIPMENT_PARTNERS = ["INHOUSE", "PATHOA", "STEADFAST", "REDX"];

export async function updateShipment(
  orderId: string,
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin("orders");

  const partner = String(formData.get("partner") ?? "").trim();
  const trackingCode = String(formData.get("trackingCode") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!SHIPMENT_STATUSES.includes(status)) {
    return { errors: { status: ["অবৈধ শিপমেন্ট স্ট্যাটাস"] } };
  }
  if (partner && !SHIPMENT_PARTNERS.includes(partner)) {
    return { errors: { partner: ["অবৈধ ডেলিভারি পার্টনার"] } };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { message: "অর্ডার খুঁজে পাওয়া যায়নি" };

  await prisma.shipment.update({
    where: { orderId },
    data: {
      partner: partner || null,
      trackingCode: trackingCode || null,
      status,
      shippedAt: status === "IN_TRANSIT" ? new Date() : undefined,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined,
    },
  });
  await logAudit(adminId, "UPDATE", "SHIPMENT", orderId, {
    partner,
    trackingCode,
    status,
  });

  revalidatePath("/admin/orders");
  return { message: "শিপমেন্ট আপডেট হয়েছে" };
}

// ===== রিটার্ন ও রিফান্ড নিয়ন্ত্রণ =====

export async function decideReturnRequest(
  requestId: string,
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin("returns");

  const decision = String(formData.get("decision") ?? "").trim();
  const note = String(formData.get("adminNote") ?? "").trim();

  const request = await prisma.returnRequest.findUnique({
    where: { id: requestId },
    include: { order: true },
  });
  if (!request) return { message: "রিটার্ন রিকোয়েস্ট খুঁজে পাওয়া যায়নি" };
  if (request.status !== "REQUESTED") {
    return { message: "এই রিকোয়েস্ট ইতিমধ্যে প্রসেস করা হয়েছে" };
  }

  if (decision === "REJECTED") {
    await prisma.returnRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", adminNote: note || null, processedAt: new Date() },
    });
    await logAudit(adminId, "REJECT", "RETURN", requestId, {
      orderId: request.orderId,
      note,
    });
    revalidatePath("/admin/returns");
    return { message: "রিটার্ন রিকোয়েস্ট বাতিল করা হয়েছে" };
  }

  if (decision !== "APPROVED") {
    return { errors: { decision: ["সিদ্ধান্ত নির্বাচন করুন"] } };
  }

  // রিটার্ন তখনই প্রসেস হয় যখন অর্ডার পাঠানো বা ডেলিভার হয়েছে
  const fromStatus = request.order.status as OrderStatus;
  if (fromStatus !== "SHIPPED" && fromStatus !== "DELIVERED") {
    return { message: "এই অর্ডারের অবস্থায় রিটার্ন প্রসেস করা যায় না" };
  }

  const refundRaw = formData.get("refundAmount");
  const refundAmount = refundRaw ? Number(refundRaw) : 0;
  if (Number.isNaN(refundAmount) || refundAmount < 0) {
    return { errors: { refundAmount: ["সঠিক রিফান্ড পরিমাণ দিন"] } };
  }

  const item = await prisma.orderItem.findUnique({ where: { id: request.orderItemId } });
  if (!item) return { message: "অর্ডার আইটেম খুঁজে পাওয়া যায়নি" };
  const itemTotal = Number(item.price) * item.quantity;
  if (refundAmount > itemTotal) {
    return {
      errors: { refundAmount: [`সর্বোচ্চ ${formatBDT(itemTotal)} রিফান্ড করা যাবে`] },
    };
  }

  // বিদ্যমান স্ট্যাটাস-ফ্লোই ব্যবহার হয় (ডুপ্লিকেট লজিক নয়):
  // RETURNED হলে সেলারের আয় রিভার্স হয়, REFUNDED হলে প্যারেন্ট/পেমেন্ট রিফান্ড হয়
  await updateOrderStatus(request.orderId, "RETURNED");
  if (refundAmount > 0) {
    await updateOrderStatus(request.orderId, "REFUNDED");

    // প্যারেন্ট পুরো REFUNDED হলে recomputeParent-ই রিফান্ড লেজার লেখে;
    // আংশিক হলে সাব-অর্ডার লেভেলে সঠিক পরিমাণের লেজার লেখা হয়
    const sub = await prisma.order.findUnique({
      where: { id: request.orderId },
      select: { parentId: true, orderNumber: true },
    });
    if (sub?.parentId) {
      const parent = await prisma.order.findUnique({
        where: { id: sub.parentId },
        select: { status: true },
      });
      if (parent?.status !== "REFUNDED") {
        await prisma.transaction.create({
          data: {
            reference: `ref-${sub.orderNumber}`,
            type: "REFUND",
            amount: refundAmount,
            method: "INHOUSE",
            status: "COMPLETED",
            description: `Return ${requestId} — ${request.order.orderNumber}`,
            orderId: request.orderId,
            userId: request.userId,
          },
        });
      }
    }
  }

  await prisma.returnRequest.update({
    where: { id: requestId },
    data: {
      status: refundAmount > 0 ? "REFUNDED" : "APPROVED",
      refundAmount: refundAmount || null,
      adminNote: note || null,
      processedAt: new Date(),
    },
  });
  await logAudit(adminId, "APPROVE", "RETURN", requestId, {
    orderId: request.orderId,
    refundAmount,
    note,
  });

  revalidatePath("/admin/returns");
  revalidatePath("/admin/orders");
  return { message: "রিটার্ন অনুমোদিত হয়েছে" };
}

// ===== ব্যানার ম্যানেজমেন্ট =====

function parseBannerForm(formData: FormData) {
  return bannerSchema.safeParse({
    title: formData.get("title") || "",
    subtitle: formData.get("subtitle") || "",
    imageUrl: formData.get("imageUrl"),
    linkUrl: formData.get("linkUrl") || "",
    position: formData.get("position"),
    sortOrder: formData.get("sortOrder") || "0",
    isActive: formData.get("isActive") || undefined,
  });
}

function bannerData(d: z.infer<typeof bannerSchema>, isActive: boolean) {
  return {
    title: d.title ? d.title : null,
    subtitle: d.subtitle ? d.subtitle : null,
    imageUrl: d.imageUrl,
    linkUrl: d.linkUrl ? d.linkUrl : null,
    position: d.position,
    sortOrder: d.sortOrder,
    isActive,
  };
}

export async function createBanner(
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin("banners");

  const parsed = parseBannerForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  const banner = await prisma.banner.create({
    data: bannerData(parsed.data, !!parsed.data.isActive),
  });
  await logAudit(adminId, "CREATE", "BANNER", banner.id, {
    position: banner.position,
    title: banner.title,
  });

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { message: "ব্যানার তৈরি হয়েছে" };
}

export async function updateBanner(
  id: string,
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin("banners");

  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) {
    return { errors: { imageUrl: ["ব্যানার খুঁজে পাওয়া যায়নি"] } };
  }

  const parsed = parseBannerForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  await prisma.banner.update({
    where: { id },
    data: bannerData(parsed.data, !!parsed.data.isActive),
  });
  await logAudit(adminId, "UPDATE", "BANNER", id, {
    position: parsed.data.position,
    title: parsed.data.title || null,
  });

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { message: "ব্যানার আপডেট হয়েছে" };
}

export async function toggleBanner(id: string) {
  const adminId = await requireAdmin("banners");

  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) throw new Error("ব্যানার খুঁজে পাওয়া যায়নি");

  const next = !existing.isActive;
  await prisma.banner.update({ where: { id }, data: { isActive: next } });
  await logAudit(adminId, "UPDATE", "BANNER", id, { isActive: next });

  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function deleteBanner(id: string) {
  const adminId = await requireAdmin("banners");

  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) throw new Error("ব্যানার খুঁজে পাওয়া যায়নি");

  // ব্যানারের কোনো অর্ডার/আর্থিক রেকর্ড থাকে না — হার্ড ডিলিট নিরাপদ
  await prisma.banner.delete({ where: { id } });
  await logAudit(adminId, "DELETE", "BANNER", id, { title: existing.title });

  revalidatePath("/admin/banners");
  revalidatePath("/");
}

// ===== ওয়েবসাইট সেটিংস =====

export async function saveSiteSettings(
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin("settings");

  const parsed = siteSettingsSchema.safeParse({
    siteName: formData.get("siteName"),
    siteTagline: formData.get("siteTagline") || "",
    supportPhone: formData.get("supportPhone") || "",
    supportEmail: formData.get("supportEmail") || "",
    orderPhone: formData.get("orderPhone") || "",
    announcement: formData.get("announcement") || "",
    showFlashSale: formData.get("showFlashSale") || undefined,
    showNewArrivals: formData.get("showNewArrivals") || undefined,
    showBestRated: formData.get("showBestRated") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  const d = parsed.data;
  const entries: [string, Prisma.InputJsonValue | Prisma.JsonNullValueInput][] = [
    [SITE_SETTING_KEYS.siteName, d.siteName],
    [SITE_SETTING_KEYS.siteTagline, d.siteTagline || Prisma.JsonNull],
    [SITE_SETTING_KEYS.supportPhone, d.supportPhone || Prisma.JsonNull],
    [SITE_SETTING_KEYS.supportEmail, d.supportEmail || Prisma.JsonNull],
    [SITE_SETTING_KEYS.orderPhone, d.orderPhone || Prisma.JsonNull],
    [SITE_SETTING_KEYS.announcement, d.announcement || Prisma.JsonNull],
    [SITE_SETTING_KEYS.showFlashSale, !!d.showFlashSale],
    [SITE_SETTING_KEYS.showNewArrivals, !!d.showNewArrivals],
    [SITE_SETTING_KEYS.showBestRated, !!d.showBestRated],
  ];

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );
  await logAudit(adminId, "UPDATE", "SETTING", undefined, {
    keys: entries.map(([key]) => key),
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { message: "সেটিংস সেভ হয়েছে" };
}

// ===== স্টাফ ম্যানেজমেন্ট (শুধু ADMIN) =====

export async function createStaff(_prevState: AdminState, formData: FormData): Promise<AdminState> {
  const adminId = await requireAdmin();
  const parsed = staffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { errors: { email: ["এই ইমেইলে ইতিমধ্যে অ্যাকাউন্ট আছে"] } };
  }

  const staff = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: await bcrypt.hash(parsed.data.password, 10),
      role: "STAFF",
      permissions: parsed.data.permissions,
    },
  });

  await logAudit(adminId, "CREATE", "USER", staff.id, {
    role: "STAFF",
    permissions: parsed.data.permissions,
  });

  revalidatePath("/admin/staff");
  return { message: "স্টাফ অ্যাকাউন্ট তৈরি হয়েছে" };
}

export async function updateStaffPermissions(
  staffId: string,
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  const adminId = await requireAdmin();
  const parsed = staffPermissionsSchema.safeParse({
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const staff = await prisma.user.findUnique({ where: { id: staffId } });
  if (!staff || staff.role !== "STAFF") {
    return { errors: { permissions: ["স্টাফ খুঁজে পাওয়া যায়নি"] } };
  }

  await prisma.user.update({
    where: { id: staffId },
    data: { permissions: parsed.data.permissions },
  });

  await logAudit(adminId, "UPDATE", "USER", staffId, {
    permissions: parsed.data.permissions,
  });

  revalidatePath("/admin/staff");
  return { message: "পারমিশন আপডেট হয়েছে" };
}

export async function deleteStaff(staffId: string, _prevState: AdminState): Promise<AdminState> {
  const adminId = await requireAdmin();
  const staff = await prisma.user.findUnique({ where: { id: staffId } });
  if (!staff || staff.role !== "STAFF") {
    return { errors: { form: ["স্টাফ খুঁজে পাওয়া যায়নি"] } };
  }

  // অডিট লগ অমোচনীয় — রেকর্ড থাকা স্টাফ ডিলিট করা যায় না
  const auditCount = await prisma.auditLog.count({ where: { adminId: staffId } });
  if (auditCount > 0) {
    return { errors: { form: ["এই স্টাফের অডিট রেকর্ড থাকায় ডিলিট করা যাবে না"] } };
  }

  await prisma.user.delete({ where: { id: staffId } });

  await logAudit(adminId, "DELETE", "USER", staffId, { role: "STAFF" });

  revalidatePath("/admin/staff");
  return { message: "স্টাফ ডিলিট হয়েছে" };
}

// ===== অ্যাডমিন রোল রিকোয়েস্ট রিভিউ (শুধু ADMIN) =====

export async function approveAdminRequest(id: string) {
  const adminId = await requireAdmin();
  const request = await prisma.adminRequest.findUnique({ where: { id } });
  if (!request) throw new Error("অনুরোধ খুঁজে পাওয়া যায়নি");
  if (request.status !== "PENDING") throw new Error("এই অনুরোধ ইতিমধ্যে রিভিউ হয়েছে");

  await prisma.$transaction([
    prisma.user.update({ where: { id: request.userId }, data: { role: "ADMIN" } }),
    prisma.adminRequest.update({
      where: { id },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: adminId },
    }),
  ]);

  await logAudit(adminId, "APPROVE", "USER", request.userId, {
    action: "ADMIN_ROLE_GRANTED",
    requestId: id,
  });

  revalidatePath("/admin/staff");
  revalidatePath("/become-admin");
}

export async function rejectAdminRequest(id: string) {
  const adminId = await requireAdmin();
  const request = await prisma.adminRequest.findUnique({ where: { id } });
  if (!request) throw new Error("অনুরোধ খুঁজে পাওয়া যায়নি");
  if (request.status !== "PENDING") throw new Error("এই অনুরোধ ইতিমধ্যে রিভিউ হয়েছে");

  await prisma.adminRequest.update({
    where: { id },
    data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: adminId },
  });

  await logAudit(adminId, "REJECT", "USER", request.userId, {
    action: "ADMIN_ROLE_REJECTED",
    requestId: id,
  });

  revalidatePath("/admin/staff");
  revalidatePath("/become-admin");
}
