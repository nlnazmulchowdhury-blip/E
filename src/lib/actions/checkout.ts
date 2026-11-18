"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validation";
import { stockOf, type InventoryRow } from "@/lib/inventory";

export type CheckoutState = {
  errors?: Record<string, string[]>;
  message?: string;
};

const DELIVERY_PRICING = {
  STANDARD: { inside: 60, outside: 120 },
  EXPRESS: { inside: 120, outside: 200 },
} as const;

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SD-${timestamp}${random}`;
}

function effectivePrice(product: { price: unknown; isFlashSale: boolean; flashSalePrice?: unknown | null }) {
  return product.isFlashSale && product.flashSalePrice
    ? Number(product.flashSalePrice)
    : Number(product.price);
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type StockRow = InventoryRow & { id: string };

// Atomic stock decrement: কন্ডিশনাল updateMany (stock >= qty) — ফ্রন্টএন্ড কখনো স্টক কমায় না,
// ব্যর্থ হলে পুরো ট্রানজেকশন রোলব্যাক হয়
async function decrementStock(
  tx: TxClient,
  rows: StockRow[],
  variantId: string | null,
  quantity: number
) {
  if (variantId !== null) {
    const row = rows.find((r) => r.variantId === variantId);
    if (!row || row.stock < quantity) throw new Error("STOCK");
    const res = await tx.inventory.updateMany({
      where: { id: row.id, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (res.count === 0) throw new Error("STOCK");
    return;
  }

  const variantRows = rows.filter((r) => r.variantId !== null);
  if (variantRows.length > 0) {
    let remaining = quantity;
    for (const row of variantRows) {
      if (remaining <= 0) break;
      const take = Math.min(row.stock, remaining);
      if (take > 0) {
        const res = await tx.inventory.updateMany({
          where: { id: row.id, stock: { gte: take } },
          data: { stock: { decrement: take } },
        });
        if (res.count === 0) throw new Error("STOCK");
        remaining -= take;
      }
    }
    if (remaining > 0) throw new Error("STOCK");
    return;
  }

  const row = rows.find((r) => r.variantId === null);
  if (!row || row.stock < quantity) throw new Error("STOCK");
  const res = await tx.inventory.updateMany({
    where: { id: row.id, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  if (res.count === 0) throw new Error("STOCK");
}

export async function placeOrder(
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const parsed = checkoutSchema.safeParse({
    addressId: formData.get("addressId"),
    deliveryMethod: formData.get("deliveryMethod"),
    paymentMethod: formData.get("paymentMethod"),
    couponCode: formData.get("couponCode"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "ফর্মে ভুল আছে",
    };
  }

  const { addressId, deliveryMethod, paymentMethod, couponCode, note } = parsed.data;

  const [address, cartItems] = await Promise.all([
    prisma.address.findFirst({ where: { id: addressId, userId } }),
    prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: { include: { inventory: true, seller: true } },
        variant: true,
      },
    }),
  ]);

  if (!address) {
    return { errors: { addressId: ["ঠিকানাটি পাওয়া যায়নি"] } };
  }
  if (cartItems.length === 0) {
    return { message: "কার্ট খালি" };
  }

  for (const item of cartItems) {
    const stock = stockOf(item.product.inventory, item.variantId);
    if (item.product.status !== "APPROVED" || item.product.deletedAt || stock < item.quantity) {
      return {
        message: `"${item.product.title}" প্রোডাক্টের পর্যাপ্ত স্টক নেই`,
      };
    }
  }

  const unitPrices = new Map(cartItems.map((item) => [item.id, effectivePrice(item.product)]));
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (unitPrices.get(item.id) ?? 0) * item.quantity,
    0
  );

  let discount = 0;
  let appliedCoupon: string | null = null;

  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    const now = new Date();
    const valid =
      coupon &&
      coupon.isActive &&
      (!coupon.startsAt || coupon.startsAt <= now) &&
      (!coupon.endsAt || coupon.endsAt >= now) &&
      (!coupon.maxUses || coupon.usedCount < coupon.maxUses);
    if (!valid) {
      return { message: "কুপনটি অবৈধ বা মেয়াদোত্তীর্ণ" };
    }
    appliedCoupon = coupon.code;
  }

  if (appliedCoupon) {
    const coupon = await prisma.coupon.findUnique({ where: { code: appliedCoupon } });
    if (coupon) {
      if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
        return {
          message: `এই কুপন ব্যবহারের জন্য সর্বনিম্ন ${coupon.minOrderAmount} টাকার অর্ডার প্রয়োজন`,
        };
      }
      discount =
        coupon.type === "PERCENT"
          ? Math.round((subtotal * Number(coupon.value)) / 100)
          : Number(coupon.value);
      discount = Math.min(discount, subtotal);
    }
  }

  const pricing = DELIVERY_PRICING[deliveryMethod];
  const shippingCharge = address.division.toLowerCase().includes("dhaka")
    ? pricing.inside
    : pricing.outside;
  const total = subtotal + shippingCharge - discount;

  // কার্টের আইটেমগুলো Seller অনুযায়ী ভাগ — null = প্ল্যাটফর্মের নিজস্ব পণ্য
  const groups = new Map<string | null, typeof cartItems>();
  for (const item of cartItems) {
    const key = item.product.sellerId;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const groupKeys = [...groups.keys()];

  const groupSubtotals = new Map<string | null, number>();
  const groupDiscounts = new Map<string | null, number>();
  let remainingDiscount = discount;
  for (const key of groupKeys) {
    const gs = groups.get(key)!.reduce(
      (sum, item) => sum + (unitPrices.get(item.id) ?? 0) * item.quantity,
      0
    );
    groupSubtotals.set(key, gs);
    if (key === groupKeys[groupKeys.length - 1]) {
      groupDiscounts.set(key, Math.min(gs, remainingDiscount));
    } else {
      const share = Math.min(gs, Math.round((discount * gs) / subtotal));
      groupDiscounts.set(key, share);
      remainingDiscount -= share;
    }
  }

  let orderId: string;
  try {
    orderId = await prisma.$transaction(async (tx) => {
      const orderNumber = generateOrderNumber();
      const shippingAddress = `${address.addressLine}, ${address.thana}, ${address.district}, ${address.division}`;

      // Parent Order — কাস্টমার যা দেখে: নাম্বার, টোটাল, পেমেন্ট, ঠিকানা
      const parent = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subtotal,
          shippingCharge,
          discount,
          total,
          deliveryMethod,
          paymentMethod,
          paymentStatus: "PENDING",
          couponCode: appliedCoupon,
          shippingName: address.fullName,
          shippingPhone: address.phone,
          shippingAddress,
          note: note || null,
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: "PENDING",
              changedByRole: "SYSTEM",
              note: "অর্ডার তৈরি হয়েছে",
            },
          },
        },
      });

      // Seller অনুযায়ী Sub-orders — প্রতিটি সেলার নিজের ডেলিভারি ও হিসাব আলাদা দেখে
      let subIndex = 0;
      const commissionRows: {
        orderId: string;
        orderItemId: string;
        sellerId: string;
        rate: number;
        amount: number;
      }[] = [];

      for (const key of groupKeys) {
        subIndex += 1;
        const groupItems = groups.get(key)!;
        const sub = await tx.order.create({
          data: {
            orderNumber: `${orderNumber}-${subIndex}`,
            parentId: parent.id,
            sellerId: key,
            userId,
            subtotal: groupSubtotals.get(key)!,
            discount: groupDiscounts.get(key)!,
            status: "PENDING",
            shipment: { create: { partner: "INHOUSE", status: "PENDING" } },
            statusHistory: {
              create: {
                fromStatus: null,
                toStatus: "PENDING",
                changedByRole: "SYSTEM",
                note: "সাব-অর্ডার তৈরি হয়েছে",
              },
            },
            items: {
              create: groupItems.map((item) => ({
                productId: item.productId,
                // Snapshot — নাম, দাম, ভ্যারিয়েন্ট, পরিমাণ সব অর্ডারে জমা থাকে
                title: item.product.title,
                price: unitPrices.get(item.id) ?? item.product.price,
                quantity: item.quantity,
                variantId: item.variantId,
                variantName: item.variant?.name ?? null,
                variantSku: item.variant?.sku ?? null,
                sellerId: item.product.sellerId,
              })),
            },
          },
          include: { items: true },
        });

        if (key) {
          const seller = groupItems[0].product.seller;
          const rate = seller ? Number(seller.commissionRate) : 0;
          for (const item of sub.items) {
            commissionRows.push({
              orderId: sub.id,
              orderItemId: item.id,
              sellerId: key,
              rate,
              amount: Math.round((Number(item.price) * item.quantity * rate) / 100),
            });
          }
        }
      }

      // Rule: স্টক শুধু ব্যাকএন্ডে, অ্যাটমিক কন্ডিশনাল আপডেটে
      for (const item of cartItems) {
        await decrementStock(tx, item.product.inventory, item.variantId, item.quantity);
      }

      await tx.cartItem.deleteMany({ where: { userId } });

      // Rule: পেমেন্ট সফল হওয়ার আগে Paid নয় — সবসময় PENDING থেকে শুরু
      await tx.payment.create({
        data: {
          orderId: parent.id,
          method: paymentMethod,
          status: "PENDING",
          amount: total,
        },
      });

      // আর্থিক লেনদেন লেজার (Transaction.reference ইউনিক — ইডেমপোটেন্সি)
      await tx.transaction.create({
        data: {
          reference: `pay-${parent.orderNumber}`,
          type: "PAYMENT",
          amount: total,
          method: paymentMethod,
          status: "PENDING",
          description: `Order ${parent.orderNumber}`,
          orderId: parent.id,
          userId,
        },
      });

      // সেলার কমিশন (অর্ডার আইটেম প্রতি, ইউনিক — ডাবল কমিশন অসম্ভব)
      for (const row of commissionRows) {
        await tx.commission.create({ data: { ...row, status: "PENDING" } });
      }

      if (appliedCoupon) {
        await tx.coupon.update({
          where: { code: appliedCoupon },
          data: { usedCount: { increment: 1 } },
        });
      }

      return parent.id;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "STOCK") {
      return { message: "পর্যাপ্ত স্টক নেই — কার্ট আবার চেক করুন" };
    }
    throw e;
  }

  revalidatePath("/cart");
  revalidatePath("/account/orders");
  redirect(`/account/orders/${orderId}?placed=1`);
}
