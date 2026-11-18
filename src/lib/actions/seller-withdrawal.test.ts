import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestWithdrawal } from "./seller";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    sellerProfile: { findUnique: vi.fn(), update: vi.fn() },
    withdrawal: { create: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => {
      for (const op of ops) await op;
    }),
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

function approvedProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "sp-1",
    status: "APPROVED",
    shop: { id: "shop-1" },
    balance: 5000,
    bkashNumber: "01712345678",
    bankName: "ডাচ্-বাংলা ব্যাংক",
    bankAccountName: "Nazmul Chowdhury",
    bankAccountNo: "1234567890",
    ...overrides,
  };
}

function validForm() {
  const fd = new FormData();
  fd.set("amount", "500");
  fd.set("method", "BKASH");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "SELLER" } });
  mocks.prisma.sellerProfile.findUnique.mockResolvedValue(approvedProfile());
});

describe("requestWithdrawal", () => {
  it("ব্যালেন্স থেকে রিজার্ভ করে PENDING উইথড্র তৈরি করে", async () => {
    const result = await requestWithdrawal({}, validForm());

    expect(result).toEqual({
      message: "উইথড্র রিকোয়েস্ট জমা হয়েছে — অ্যাডমিন অনুমোদনের পর টাকা পাঠানো হবে",
    });
    expect(mocks.prisma.withdrawal.create).toHaveBeenCalledWith({
      data: { sellerId: "sp-1", amount: 500, method: "BKASH", status: "PENDING" },
    });
    expect(mocks.prisma.sellerProfile.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { balance: { decrement: 500 } },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/seller/earnings");
  });

  it("ব্যালেন্সের বেশি তুলতে গেলে এরর", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue(approvedProfile({ balance: 300 }));
    const result = await requestWithdrawal({}, validForm());

    expect(result.errors?.amount).toBeTruthy();
    expect(mocks.prisma.withdrawal.create).not.toHaveBeenCalled();
  });

  it("সর্বনিম্ন ১০০ টাকার কম হলে এরর", async () => {
    const fd = new FormData();
    fd.set("amount", "50");
    fd.set("method", "BKASH");
    const result = await requestWithdrawal({}, fd);

    expect(result.errors?.amount).toBeTruthy();
    expect(mocks.prisma.withdrawal.create).not.toHaveBeenCalled();
  });

  it("বিকাশ নম্বর ছাড়া BKASH-এ এরর", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue(
      approvedProfile({ bkashNumber: null })
    );
    const result = await requestWithdrawal({}, validForm());

    expect(result.errors?.method).toBeTruthy();
    expect(mocks.prisma.withdrawal.create).not.toHaveBeenCalled();
  });

  it("ব্যাংক তথ্য ছাড়া BANK-এ এরর", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue(
      approvedProfile({ bankName: null, bankAccountNo: null })
    );
    const fd = validForm();
    fd.set("method", "BANK");
    const result = await requestWithdrawal({}, fd);

    expect(result.errors?.method).toBeTruthy();
    expect(mocks.prisma.withdrawal.create).not.toHaveBeenCalled();
  });

  it("পদ্ধতি না দিলে এরর", async () => {
    const fd = new FormData();
    fd.set("amount", "500");
    const result = await requestWithdrawal({}, fd);

    expect(result.errors?.method).toBeTruthy();
    expect(mocks.prisma.withdrawal.create).not.toHaveBeenCalled();
  });

  it("প্রোফাইল APPROVED না হলে access-denied-এ রিডাইরেক্ট", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue(
      approvedProfile({ status: "PENDING" })
    );
    await expect(requestWithdrawal({}, validForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
  });
});
