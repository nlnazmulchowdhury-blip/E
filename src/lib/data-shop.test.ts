import { describe, it, expect, vi } from "vitest";
import { getShopBySlug, getShopProducts } from "./data";

const mocks = vi.hoisted(() => ({
  prisma: {
    shop: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

describe("getShopBySlug", () => {
  it("স্লাগ দিয়ে শপ + সেলার প্রোফাইল + অ্যাপ্রুভড প্রোডাক্ট কাউন্ট আনে", async () => {
    mocks.prisma.shop.findUnique.mockResolvedValue({ id: "shop-1" });

    await getShopBySlug("demo-store");

    expect(mocks.prisma.shop.findUnique).toHaveBeenCalledWith({
      where: { slug: "demo-store" },
      include: {
        sellerProfile: {
          include: {
            _count: {
              select: {
                products: { where: { status: "APPROVED", deletedAt: null } },
              },
            },
          },
        },
      },
    });
  });
});

describe("getShopProducts", () => {
  it("সেই সেলারের শুধু APPROVED ও ডিলিটেড-নয় প্রোডাক্ট আনে", async () => {
    mocks.prisma.product.findMany.mockResolvedValue([]);

    await getShopProducts("sp-1");

    const call = mocks.prisma.product.findMany.mock.calls[0][0];
    expect(call.where).toEqual({
      sellerId: "sp-1",
      status: "APPROVED",
      deletedAt: null,
    });
    expect(call.orderBy).toEqual({ createdAt: "desc" });
    // প্রোডাক্ট কার্ডের জন্য ছবি ও ইনভেন্টরি অন্তর্ভুক্ত
    expect(call.include.images).toBeTruthy();
    expect(call.include.inventory).toBeTruthy();
  });
});
