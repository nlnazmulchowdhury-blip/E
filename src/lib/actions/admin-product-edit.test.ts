import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateProduct, deleteProduct } from "./admin";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    category: { findUnique: vi.fn() },
    product: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    inventory: { findFirst: vi.fn(), update: vi.fn() },
    productImage: { deleteMany: vi.fn(), createMany: vi.fn() },
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

const EXISTING = {
  id: "p-1",
  title: "Panjabi Premium Cotton",
  slug: "panjabi-premium-cotton",
  deletedAt: null,
  status: "APPROVED",
};

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
  mocks.prisma.product.findUnique.mockResolvedValue(EXISTING);
  mocks.prisma.product.findFirst.mockResolvedValue(null);
  mocks.prisma.product.update.mockResolvedValue({ id: "p-1" });
  mocks.prisma.inventory.findFirst.mockResolvedValue({ id: "inv-1", stock: 50 });
  mocks.prisma.inventory.update.mockResolvedValue({ id: "inv-1" });
});

describe("updateProduct", () => {
  it("সঠিক ডেটায় প্রোডাক্ট আপডেট করে, ইনভেন্টরি ও ইমেজ রিপ্লেস করে", async () => {
    const result = await updateProduct("p-1", {}, validForm());

    expect(result).toEqual({ message: "প্রোডাক্ট আপডেট হয়েছে" });
    const data = mocks.prisma.product.update.mock.calls[0][0].data;
    expect(data.title).toBe("Panjabi Premium Cotton");
    expect(data.slug).toBe("panjabi-premium-cotton");
    expect(data.price).toBe(2499);
    expect(data.compareAtPrice).toBe(2999);
    expect(data.status).toBe("APPROVED");
    expect(data.categoryId).toBe("cat-1");

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

  it("AuditLog ও সব প্রাসঙ্গিক পেজ রিভ্যালিডেট করে", async () => {
    await updateProduct("p-1", {}, validForm());

    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "UPDATE",
        entity: "PRODUCT",
        entityId: "p-1",
        details: { title: "Panjabi Premium Cotton", slug: "panjabi-premium-cotton" },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/products");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/products/p-1/edit");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/categories/fashion");
  });

  it("টাইটেল বদলালে স্লাগও বদলায়", async () => {
    const fd = validForm();
    fd.set("title", "Premium Cotton Panjabi");
    await updateProduct("p-1", {}, fd);

    const data = mocks.prisma.product.update.mock.calls[0][0].data;
    expect(data.slug).toBe("premium-cotton-panjabi");
  });

  it("নতুন স্লাগ অন্য প্রোডাক্টে থাকলে সাফিক্স যোগ করে", async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({ id: "p-2" });
    const fd = validForm();
    fd.set("title", "Premium Cotton Panjabi");
    await updateProduct("p-1", {}, fd);

    const data = mocks.prisma.product.update.mock.calls[0][0].data;
    expect(data.slug).toMatch(/^premium-cotton-panjabi-[a-z0-9]{6}$/);
  });

  it("ফ্ল্যাশ সেল চালু করলে flashSalePrice আপডেট হয়", async () => {
    const fd = validForm();
    fd.set("isFlashSale", "on");
    fd.set("flashSalePrice", "1999");
    await updateProduct("p-1", {}, fd);

    const data = mocks.prisma.product.update.mock.calls[0][0].data;
    expect(data.isFlashSale).toBe(true);
    expect(data.flashSalePrice).toBe(1999);
  });

  it("যে প্রোডাক্ট নেই (বা সফট-ডিলিটেড) তাতে এরর দেয়, আপডেট করে না", async () => {
    mocks.prisma.product.findUnique.mockResolvedValue(null);
    const result = await updateProduct("gone", {}, validForm());

    expect(result.errors?.title).toEqual(["প্রোডাক্ট খুঁজে পাওয়া যায়নি"]);
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("ভুল ক্যাটাগরিতে এরর দেয়, আপডেট করে না", async () => {
    mocks.prisma.category.findUnique.mockResolvedValue(null);
    const result = await updateProduct("p-1", {}, validForm());

    expect(result.errors?.categoryId).toEqual(["ক্যাটাগরি খুঁজে পাওয়া যায়নি"]);
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });

  it("ভুল ডেটায় এরর রিটার্ন করে, কিছু আপডেট করে না", async () => {
    const fd = new FormData();
    fd.set("title", "ক");
    const result = await updateProduct("p-1", {}, fd);

    expect(result.errors?.title).toBeTruthy();
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন ইউজার লগইন পেজে রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "CUSTOMER" } });
    await expect(updateProduct("p-1", {}, validForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });
});

describe("deleteProduct", () => {
  it("সফট ডিলিট করে — deletedAt সেট, স্ট্যাটাস INACTIVE, অডিট লগ", async () => {
    await deleteProduct("p-1");

    const args = mocks.prisma.product.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: "p-1" });
    expect(args.data.status).toBe("INACTIVE");
    expect(args.data.deletedAt).toBeInstanceOf(Date);

    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "DELETE",
        entity: "PRODUCT",
        entityId: "p-1",
        details: { title: "Panjabi Premium Cotton" },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/products");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("হার্ড ডিলিট বা অর্ডার রেকর্ড মুছে ফেলে না", async () => {
    await deleteProduct("p-1");

    expect(mocks.prisma.product.delete).not.toHaveBeenCalled();
    expect(mocks.prisma.product.deleteMany).not.toHaveBeenCalled();
    expect(mocks.prisma.productImage.deleteMany).not.toHaveBeenCalled();
  });

  it("যে প্রোডাক্ট নেই তাতে এরর থ্রো করে", async () => {
    mocks.prisma.product.findUnique.mockResolvedValue(null);
    await expect(deleteProduct("gone")).rejects.toThrow("প্রোডাক্ট খুঁজে পাওয়া যায়নি");
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন ইউজার লগইন পেজে রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "SELLER" } });
    await expect(deleteProduct("p-1")).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
    expect(mocks.prisma.product.update).not.toHaveBeenCalled();
  });
});
