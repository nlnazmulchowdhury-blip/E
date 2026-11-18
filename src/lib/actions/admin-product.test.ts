import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProduct } from "./admin";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    category: { findUnique: vi.fn() },
    product: { findUnique: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
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

function validForm() {
  const fd = new FormData();
  fd.set("title", "Panjabi Premium Cotton");
  fd.set("description", "প্রিমিয়াম কটন পাঞ্জাবি, আরামদায়ক এবং টেকসই।");
  fd.set("price", "2499");
  fd.set("compareAtPrice", "2999");
  fd.set("categoryId", "cat-1");
  fd.set("stock", "50");
  fd.set("imageUrls", "https://example.com/a.jpg\nhttps://example.com/b.jpg");
  fd.set("status", "APPROVED");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
  mocks.prisma.category.findUnique.mockResolvedValue({ id: "cat-1", slug: "fashion" });
  mocks.prisma.product.findUnique.mockResolvedValue(null);
  mocks.prisma.product.create.mockResolvedValue({ id: "p-1" });
});

describe("createProduct", () => {
  it("সঠিক ডেটায় প্রোডাক্ট + ইনভেন্টরি + ইমেজ তৈরি করে", async () => {
    const result = await createProduct({}, validForm());

    expect(result).toEqual({ message: "প্রোডাক্ট তৈরি হয়েছে" });
    expect(mocks.prisma.product.create).toHaveBeenCalledTimes(1);
    const data = mocks.prisma.product.create.mock.calls[0][0].data;
    expect(data.title).toBe("Panjabi Premium Cotton");
    expect(data.slug).toBe("panjabi-premium-cotton");
    expect(data.price).toBe(2499);
    expect(data.compareAtPrice).toBe(2999);
    expect(data.status).toBe("APPROVED");
    expect(data.isFlashSale).toBe(false);
    expect(data.flashSalePrice).toBeNull();
    expect(data.categoryId).toBe("cat-1");
    expect(data.sellerId).toBeNull();
    expect(data.inventory).toEqual({ create: { stock: 50 } });
    expect(data.images.create).toHaveLength(2);
    expect(data.images.create[0]).toEqual({ url: "https://example.com/a.jpg", position: 0 });
    expect(data.images.create[1]).toEqual({ url: "https://example.com/b.jpg", position: 1 });
  });

  it("ফ্ল্যাশ সেল চালু থাকলে flashSalePrice ও isFlashSale সেভ হয়", async () => {
    const fd = validForm();
    fd.set("isFlashSale", "on");
    fd.set("flashSalePrice", "1999");

    await createProduct({}, fd);

    const data = mocks.prisma.product.create.mock.calls[0][0].data;
    expect(data.isFlashSale).toBe(true);
    expect(data.flashSalePrice).toBe(1999);
  });

  it("AuditLog ও সব প্রাসঙ্গিক পেজ রিভ্যালিডেট করে", async () => {
    await createProduct({}, validForm());

    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "CREATE",
        entity: "PRODUCT",
        entityId: "p-1",
        details: { title: "Panjabi Premium Cotton", slug: "panjabi-premium-cotton" },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/products");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/categories/fashion");
  });

  it("স্লাগ আগে থেকে থাকলে সাফিক্স যোগ করে", async () => {
    mocks.prisma.product.findUnique.mockResolvedValue({ id: "old" });
    await createProduct({}, validForm());
    const data = mocks.prisma.product.create.mock.calls[0][0].data;
    expect(data.slug).toMatch(/^panjabi-premium-cotton-[a-z0-9]{6}$/);
  });

  it("ভুল ডেটায় এরর রিটার্ন করে, কিছু তৈরি করে না", async () => {
    const fd = new FormData();
    fd.set("title", "ক");
    const result = await createProduct({}, fd);

    expect(result.errors?.title).toBeTruthy();
    expect(mocks.prisma.product.create).not.toHaveBeenCalled();
  });

  it("ফ্ল্যাশ সেল চালু কিন্তু দাম না দিলে flashSalePrice এরর", async () => {
    const fd = validForm();
    fd.set("isFlashSale", "on");
    const result = await createProduct({}, fd);

    expect(result.errors?.flashSalePrice).toBeTruthy();
    expect(mocks.prisma.product.create).not.toHaveBeenCalled();
  });

  it("অবৈধ ছবির লিংকে imageUrls এরর", async () => {
    const fd = validForm();
    fd.set("imageUrls", "ftp://bad.example/a.jpg");
    const result = await createProduct({}, fd);

    expect(result.errors?.imageUrls).toBeTruthy();
    expect(mocks.prisma.product.create).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন ইউজার লগইন পেজে রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "CUSTOMER" } });
    await expect(createProduct({}, validForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
    expect(mocks.prisma.product.create).not.toHaveBeenCalled();
  });
});
