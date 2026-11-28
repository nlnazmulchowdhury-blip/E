import { describe, it, expect, vi, beforeEach } from "vitest";
import { addToCart } from "./cart";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    product: { findUnique: vi.fn() },
    cartItem: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
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

function product(stock = 10) {
  return {
    id: "p-1",
    status: "APPROVED",
    deletedAt: null,
    inventory: [{ id: "inv-1", variantId: null, stock }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "u-1" } });
  mocks.prisma.product.findUnique.mockResolvedValue(product());
  mocks.prisma.cartItem.findFirst.mockResolvedValue(null);
  mocks.prisma.cartItem.create.mockResolvedValue({ id: "ci-1" });
});

describe("addToCart", () => {
  it("প্রথমবার কার্টে যোগ করে", async () => {
    const result = await addToCart("p-1", 2);

    expect(result).toEqual({ added: true, alreadyInCart: false });
    expect(mocks.prisma.cartItem.create).toHaveBeenCalledWith({
      data: { userId: "u-1", productId: "p-1", variantId: null, quantity: 2 },
    });
  });

  it("আগে থেকে কার্টে থাকলে বার বার যোগ হয় না — পরিমাণও বাড়ে না", async () => {
    mocks.prisma.cartItem.findFirst.mockResolvedValue({
      id: "ci-1",
      quantity: 2,
    });

    const result = await addToCart("p-1", 1);

    expect(result).toEqual({ added: false, alreadyInCart: true });
    expect(mocks.prisma.cartItem.create).not.toHaveBeenCalled();
    expect(mocks.prisma.cartItem.update).not.toHaveBeenCalled();
  });

  it("স্টকের বেশি চাইলে যোগ হয় না", async () => {
    mocks.prisma.product.findUnique.mockResolvedValue(product(1));

    await expect(addToCart("p-1", 2)).rejects.toThrow("পর্যাপ্ত স্টক নেই");
    expect(mocks.prisma.cartItem.create).not.toHaveBeenCalled();
  });
});
