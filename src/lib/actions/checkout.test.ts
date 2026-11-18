import { describe, it, expect, vi, beforeEach } from "vitest";
import { placeOrder } from "./checkout";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    address: { findFirst: vi.fn() },
    cartItem: { findMany: vi.fn() },
    coupon: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mocks.redirect(...args);
    const e = new Error("NEXT_REDIRECT") as Error & { digest: string };
    e.digest = "NEXT_REDIRECT";
    throw e; // আসল redirect-এর মতো ফ্লো থামায়
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

function makeTx() {
  return {
    order: { create: vi.fn() },
    inventory: { updateMany: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    payment: { create: vi.fn() },
    transaction: { create: vi.fn() },
    commission: { create: vi.fn() },
    coupon: { update: vi.fn() },
  };
}

function cartItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "cart-1",
    productId: "p1",
    variantId: null,
    quantity: 1,
    variant: null,
    product: {
      title: "Test Product",
      status: "APPROVED",
      deletedAt: null,
      price: 1000,
      isFlashSale: false,
      flashSalePrice: null,
      sellerId: null,
      seller: null,
      inventory: [{ id: "inv-1", productId: "p1", variantId: null, stock: 50 }],
    },
    ...overrides,
  };
}

function checkoutForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("addressId", "addr-1");
  fd.set("deliveryMethod", "STANDARD");
  fd.set("paymentMethod", "COD");
  fd.set("couponCode", "");
  fd.set("note", "");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

function groupItems() {
  const panjabi = cartItem({
    id: "cart-p",
    productId: "prod-panjabi",
    quantity: 1,
    product: {
      title: "Men's Cotton Panjabi",
      status: "APPROVED",
      deletedAt: null,
      price: 2499,
      isFlashSale: false,
      flashSalePrice: null,
      sellerId: "seller-1",
      seller: { id: "seller-1", commissionRate: 5 },
      inventory: [{ id: "inv-p", productId: "prod-panjabi", variantId: null, stock: 10 }],
    },
  });
  const serum = cartItem({
    id: "cart-s",
    productId: "prod-serum",
    quantity: 1,
    product: {
      title: "Organic Face Serum",
      status: "APPROVED",
      deletedAt: null,
      price: 1499,
      isFlashSale: true,
      flashSalePrice: 999,
      sellerId: "seller-1",
      seller: { id: "seller-1", commissionRate: 5 },
      inventory: [{ id: "inv-s", productId: "prod-serum", variantId: null, stock: 80 }],
    },
  });
  const rice = cartItem({
    id: "cart-r",
    productId: "prod-rice",
    quantity: 1,
    product: {
      title: "Premium Basmati Rice",
      status: "APPROVED",
      deletedAt: null,
      price: 1150,
      isFlashSale: false,
      flashSalePrice: null,
      sellerId: null,
      seller: null,
      inventory: [{ id: "inv-r", productId: "prod-rice", variantId: null, stock: 20 }],
    },
  });
  return [panjabi, serum, rice];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "CUSTOMER" } });
  mocks.prisma.address.findFirst.mockResolvedValue({
    id: "addr-1",
    userId: "user-1",
    fullName: "Demo Customer",
    phone: "01700000000",
    division: "Dhaka",
    district: "Dhaka",
    thana: "Dhanmondi",
    addressLine: "House 12, Road 5",
  });
});

describe("placeOrder — Parent + Sub-orders", () => {
  it("মাল্টি-সেলার কার্টে প্যারেন্ট + প্রতি সেলারের সাব-অর্ডার তৈরি হয়", async () => {
    const tx = makeTx();
    mocks.prisma.cartItem.findMany.mockResolvedValue(groupItems());
    mocks.prisma.coupon.findUnique.mockResolvedValue({
      code: "WELCOME10",
      type: "PERCENT",
      value: 10,
      isActive: true,
      startsAt: null,
      endsAt: null,
      maxUses: null,
      usedCount: 0,
      minOrderAmount: 1000,
    });
    mocks.prisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<string>) =>
      cb(tx)
    );
    tx.inventory.updateMany.mockResolvedValue({ count: 1 });
    tx.order.create
      .mockResolvedValueOnce({ id: "parent-1" }) // parent
      .mockResolvedValueOnce({
        // seller sub
        id: "sub-1",
        items: [
          { id: "oi-1", price: 2499, quantity: 1 },
          { id: "oi-2", price: 999, quantity: 1 },
        ],
      })
      .mockResolvedValueOnce({
        // platform sub
        id: "sub-2",
        items: [{ id: "oi-3", price: 1150, quantity: 1 }],
      });

    await expect(
      placeOrder({}, checkoutForm({ couponCode: "WELCOME10" }))
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);

    const parentCall = tx.order.create.mock.calls[0][0].data;
    expect(parentCall.orderNumber).toMatch(/^SD-/);
    expect(Number(parentCall.subtotal)).toBe(4648);
    expect(Number(parentCall.shippingCharge)).toBe(60); // ঢাকা + স্ট্যান্ডার্ড
    expect(Number(parentCall.discount)).toBe(465); // ১০%
    expect(Number(parentCall.total)).toBe(4243);
    expect(parentCall.paymentStatus).toBe("PENDING"); // Rule 6: শুরুতে Paid নয়
    expect(parentCall.deliveryMethod).toBe("STANDARD");

    const sub1 = tx.order.create.mock.calls[1][0].data;
    const sub2 = tx.order.create.mock.calls[2][0].data;
    expect(sub1.parentId).toBe("parent-1");
    expect(sub1.sellerId).toBe("seller-1");
    expect(Number(sub1.subtotal)).toBe(3498);
    expect(Number(sub1.discount)).toBe(350); // আনুপাতিক শেয়ার
    expect(sub2.parentId).toBe("parent-1");
    expect(sub2.sellerId).toBeNull();
    expect(Number(sub2.subtotal)).toBe(1150);
    expect(Number(sub2.discount)).toBe(115); // বাকি শেয়ার
    expect(350 + 115).toBe(465);

    // সেলার গ্রুপের আইটেমে কমিশন (৫%)
    expect(tx.commission.create).toHaveBeenCalledTimes(2);
    const amounts = tx.commission.create.mock.calls.map((c) => c[0].data.amount);
    expect(amounts).toContain(125); // ২৪৯৯ × ৫%
    expect(amounts).toContain(50); // ৯৯৯ × ৫% (ফ্ল্যাশ দামে)

    // পেমেন্ট PENDING + লেজার
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: "parent-1",
        method: "COD",
        status: "PENDING",
        amount: 4243,
      },
    });
    expect(tx.transaction.create).toHaveBeenCalledTimes(1);

    // স্টক ডিক্রিমেন্ট ৩টি আইটেমে + কার্ট খালি
    expect(tx.inventory.updateMany).toHaveBeenCalledTimes(3);
    expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });

    expect(mocks.redirect).toHaveBeenCalledWith("/account/orders/parent-1?placed=1");
  });

  it("পর্যাপ্ত স্টক না থাকলে অর্ডার হয় না, মেসেজ ফেরত দেয়", async () => {
    const items = groupItems();
    items[0].product.inventory[0].stock = 0;
    mocks.prisma.cartItem.findMany.mockResolvedValue(items);

    const result = await placeOrder({}, checkoutForm());

    expect(result).toEqual({
      message: '"Men\'s Cotton Panjabi" প্রোডাক্টের পর্যাপ্ত স্টক নেই',
    });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("স্টক অ্যাটমিক আপডেট ব্যর্থ হলে পুরো ট্রানজেকশন বাতিল", async () => {
    const tx = makeTx();
    mocks.prisma.cartItem.findMany.mockResolvedValue(groupItems());
    mocks.prisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<string>) =>
      cb(tx)
    );
    tx.order.create.mockResolvedValue({ id: "parent-1", items: [] });
    tx.inventory.updateMany.mockResolvedValue({ count: 0 }); // কন্ডিশনাল আপডেট ব্যর্থ

    const result = await placeOrder({}, checkoutForm());

    expect(result).toEqual({ message: "পর্যাপ্ত স্টক নেই — কার্ট আবার চেক করুন" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("ভ্যারিয়েন্টসহ প্রোডাক্টে Greedy ডিস্ট্রিবিউশনে স্টক কমে", async () => {
    const tx = makeTx();
    const variantProduct = cartItem({
      id: "cart-v",
      productId: "prod-variant",
      quantity: 4,
      variantId: null,
      product: {
        title: "Variant Product",
        status: "APPROVED",
        deletedAt: null,
        price: 500,
        isFlashSale: false,
        flashSalePrice: null,
        sellerId: null,
        seller: null,
        inventory: [
          { id: "inv-v1", productId: "prod-variant", variantId: "v1", stock: 2 },
          { id: "inv-v2", productId: "prod-variant", variantId: "v2", stock: 3 },
        ],
      },
    });
    mocks.prisma.cartItem.findMany.mockResolvedValue([variantProduct]);
    mocks.prisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<string>) =>
      cb(tx)
    );
    tx.order.create.mockResolvedValue({ id: "parent-1", items: [] });
    tx.inventory.updateMany.mockResolvedValue({ count: 1 });

    await expect(placeOrder({}, checkoutForm())).rejects.toThrow("NEXT_REDIRECT");

    const stockCalls = tx.inventory.updateMany.mock.calls.map((c) => c[0]);
    const decrements = stockCalls
      .map((c) => c.data?.stock?.decrement)
      .filter((d) => d !== undefined);
    expect(decrements).toEqual([2, 2]); // ২ + ২ = ৪
    const whereIds = stockCalls.map((c) => c.where?.id);
    expect(whereIds).toContain("inv-v1");
    expect(whereIds).toContain("inv-v2");
  });

  it("অবৈধ কুপনে অর্ডার হয় না", async () => {
    mocks.prisma.cartItem.findMany.mockResolvedValue(groupItems());
    mocks.prisma.coupon.findUnique.mockResolvedValue(null);

    const result = await placeOrder({}, checkoutForm({ couponCode: "FAKE" }));

    expect(result).toEqual({ message: "কুপনটি অবৈধ বা মেয়াদোত্তীর্ণ" });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
