import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
} from "./seller";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    sellerProfile: { findUnique: vi.fn() },
    category: { findUnique: vi.fn() },
    product: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    inventory: { findFirst: vi.fn(), update: vi.fn() },
    productImage: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mocks.redirect(...args);
    const e = new Error("NEXT_REDIRECT") as Error & { digest: string };
    e.digest = "NEXT_REDIRECT";
    throw e;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

const approvedProfile = { id: "sp-1", status: "APPROVED", shop: { id: "shop-1" } };

function validForm() {
  const fd = new FormData();
  fd.set("title", "Panjabi Premium Cotton");
  fd.set("description", "প্রিমিয়াম কটন পাঞ্জাবি, আরামদায়ক এবং টেকসই।");
  fd.set("price", "2499");
  fd.set("compareAtPrice", "2999");
  fd.set("categoryId", "cat-1");
  fd.set("stock", "50");
  fd.set("imageUrls", "https://example.com/a.jpg\nhttps://example.com/b.jpg");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "SELLER" } });
  mocks.prisma.sellerProfile.findUnique.mockResolvedValue(approvedProfile);
  mocks.prisma.category.findUnique.mockResolvedValue({ id: "cat-1" });
  mocks.prisma.product.findUnique.mockResolvedValue(null);
  mocks.prisma.product.create.mockResolvedValue({ id: "p-1" });
  mocks.prisma.product.update.mockResolvedValue({ id: "p-1" });
});

describe("createSellerProduct", () => {
  it("নিজের প্রোডাক্ট PENDING স্ট্যাটাসে তৈরি করে", async () => {
    const result = await createSellerProduct({}, validForm());

    expect(result).toEqual({
      message: "প্রোডাক্ট জমা হয়েছে — অ্যাডমিন অনুমোদনের পর সাইটে দেখাবে",
    });
    const data = mocks.prisma.product.create.mock.calls[0][0].data;
    expect(data.title).toBe("Panjabi Premium Cotton");
    expect(data.status).toBe("PENDING");
    expect(data.isFlashSale).toBe(false);
    expect(data.flashSalePrice).toBeNull();
    expect(data.sellerId).toBe("sp-1");
    expect(data.inventory).toEqual({ create: { stock: 50 } });
    expect(data.images.create).toHaveLength(2);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/seller/products");
  });

  it("ভুল ডেটায় এরর রিটার্ন করে, কিছু তৈরি করে না", async () => {
    const fd = new FormData();
    fd.set("title", "ক");
    const result = await createSellerProduct({}, fd);

    expect(result.errors?.title).toBeTruthy();
    expect(mocks.prisma.product.create).not.toHaveBeenCalled();
  });

  it("অবৈধ ক্যাটাগরিতে এরর দেখায়", async () => {
    mocks.prisma.category.findUnique.mockResolvedValue(null);
    const result = await createSellerProduct({}, validForm());

    expect(result.errors?.categoryId).toBeTruthy();
    expect(mocks.prisma.product.create).not.toHaveBeenCalled();
  });

  it("প্রোফাইল APPROVED না হলে access-denied-এ রিডাইরেক্ট", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({ id: "sp-1", status: "PENDING" });
    await expect(createSellerProduct({}, validForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
  });

  it("ডিলিটেড সেলারের প্রোডাক্ট অ্যাকশন access-denied-এ রিডাইরেক্ট", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({
      id: "sp-1",
      status: "APPROVED",
      deletedAt: new Date(),
      shop: { id: "shop-1" },
    });
    await expect(createSellerProduct({}, validForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
    expect(mocks.prisma.product.create).not.toHaveBeenCalled();
  });
});

describe("updateSellerProduct", () => {
  beforeEach(() => {
    mocks.prisma.product.findUnique.mockResolvedValue({
      id: "p-1",
      title: "পুরনো নাম",
      slug: "পুরনো-নাম",
      deletedAt: null,
    });
    mocks.prisma.inventory.findFirst.mockResolvedValue({ id: "inv-1", stock: 10 });
  });

  it("নিজের প্রোডাক্ট আপডেট করে, স্ট্যাটাস আবার PENDING হয়", async () => {
    const result = await updateSellerProduct("p-1", {}, validForm());

    expect(result).toEqual({ message: "প্রোডাক্ট আপডেট হয়েছে — আবার অনুমোদনের অপেক্ষায়" });
    expect(mocks.prisma.product.findUnique).toHaveBeenCalledWith({
      where: { id: "p-1", sellerId: "sp-1" },
    });
    const data = mocks.prisma.product.update.mock.calls[0][0].data;
    expect(data.status).toBe("PENDING");
    expect(data.price).toBe(2499);

    expect(mocks.prisma.inventory.findFirst).toHaveBeenCalledWith({
      where: { productId: "p-1", variantId: null },
    });
    expect(mocks.prisma.inventory.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { stock: 50 },
    });
    expect(mocks.prisma.productImage.deleteMany).toHaveBeenCalledWith({
      where: { productId: "p-1" },
    });
    expect(mocks.prisma.productImage.createMany).toHaveBeenCalledWith({
      data: [
        { url: "https://example.com/a.jpg", position: 0, productId: "p-1" },
        { url: "https://example.com/b.jpg", position: 1, productId: "p-1" },
      ],
    });
  });

  it("নাম একই থাকলে স্লাগ বদলায় না", async () => {
    mocks.prisma.product.findUnique.mockResolvedValue({
      id: "p-1",
      title: "Panjabi Premium Cotton",
      slug: "panjabi-premium-cotton",
      deletedAt: null,
    });
    await updateSellerProduct("p-1", {}, validForm());

    expect(mocks.prisma.product.update.mock.calls[0][0].data.slug).toBe(
      "panjabi-premium-cotton"
    );
  });

  it("অন্যের প্রোডাক্ট এডিট করা যায় না", async () => {
    mocks.prisma.product.findUnique.mockResolvedValue(null);
    const result = await updateSellerProduct("other-product", {}, validForm());

    expect(result.errors?.title).toBeTruthy();
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });

  it("ভুল ডেটায় এরর রিটার্ন করে", async () => {
    const fd = new FormData();
    fd.set("title", "ক");
    const result = await updateSellerProduct("p-1", {}, fd);

    expect(result.errors?.title).toBeTruthy();
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });
});

describe("deleteSellerProduct", () => {
  beforeEach(() => {
    mocks.prisma.product.findUnique.mockResolvedValue({
      id: "p-1",
      sellerId: "sp-1",
      deletedAt: null,
    });
  });

  it("নিজের প্রোডাক্ট সফট-ডিলিট করে (deletedAt + INACTIVE)", async () => {
    await deleteSellerProduct("p-1");

    expect(mocks.prisma.product.findUnique).toHaveBeenCalledWith({
      where: { id: "p-1", sellerId: "sp-1" },
    });
    const data = mocks.prisma.product.update.mock.calls[0][0].data;
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(data.status).toBe("INACTIVE");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/seller/products");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("অন্যের প্রোডাক্ট ডিলিট করা যায় না", async () => {
    mocks.prisma.product.findUnique.mockResolvedValue(null);
    await expect(deleteSellerProduct("other-product")).rejects.toThrow(
      "প্রোডাক্ট খুঁজে পাওয়া যায়নি"
    );
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });

  it("প্রোফাইল APPROVED না হলে access-denied-এ রিডাইরেক্ট", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({ id: "sp-1", status: "PENDING" });
    await expect(deleteSellerProduct("p-1")).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
  });
});
