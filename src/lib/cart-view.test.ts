import { describe, it, expect } from "vitest";
import { toCartDrawerItems } from "./cart-view";

const base = {
  id: "ci1",
  productId: "p1",
  variantId: null as string | null,
  quantity: 2,
  product: {
    title: "Smartphone X200 Pro 5G",
    slug: "smartphone-x200-pro-5g",
    price: "1000",
    isFlashSale: false,
    flashSalePrice: null,
    images: [{ url: "https://example.com/a.jpg" }],
    inventory: [{ variantId: null, stock: 25 }],
  },
};

describe("toCartDrawerItems", () => {
  it("সাধারণ দাম ও স্টক ম্যাপ করে", () => {
    const [item] = toCartDrawerItems([base]);
    expect(item).toMatchObject({
      id: "ci1",
      productId: "p1",
      quantity: 2,
      stock: 25,
      title: "Smartphone X200 Pro 5G",
      slug: "smartphone-x200-pro-5g",
      imageUrl: "https://example.com/a.jpg",
      unitPrice: 1000,
      originalPrice: null,
    });
  });

  it("ফ্ল্যাশ সেল হলে ইউনিট দাম ফ্ল্যাশ, অরিজিনাল আলাদা দেখায়", () => {
    const [item] = toCartDrawerItems([
      {
        ...base,
        product: {
          ...base.product,
          price: "1000",
          isFlashSale: true,
          flashSalePrice: "750",
        },
      },
    ]);
    expect(item.unitPrice).toBe(750);
    expect(item.originalPrice).toBe(1000);
  });

  it("ফ্ল্যাশ দাম মূলের সমান হলে অরিজিনাল দেখায় না", () => {
    const [item] = toCartDrawerItems([
      {
        ...base,
        product: {
          ...base.product,
          price: "1000",
          isFlashSale: true,
          flashSalePrice: "1000",
        },
      },
    ]);
    expect(item.unitPrice).toBe(1000);
    expect(item.originalPrice).toBeNull();
  });

  it("ছবি না থাকলে প্লেসহোল্ডার দেয়", () => {
    const [item] = toCartDrawerItems([
      {
        ...base,
        product: { ...base.product, images: [] },
      },
    ]);
    expect(item.imageUrl).toBe("/placeholder.svg");
  });

  it("ভ্যারিয়েন্টসহ কার্ট হলে ভ্যারিয়েন্টের স্টক নেয়", () => {
    const [item] = toCartDrawerItems([
      {
        ...base,
        variantId: "v2",
        product: {
          ...base.product,
          inventory: [
            { variantId: "v1", stock: 3 },
            { variantId: "v2", stock: 7 },
          ],
        },
      },
    ]);
    expect(item.stock).toBe(7);
  });
});
