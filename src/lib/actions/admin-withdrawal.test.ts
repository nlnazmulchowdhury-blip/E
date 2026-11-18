import { describe, it, expect, vi, beforeEach } from "vitest";
import { approveWithdrawal, rejectWithdrawal } from "./admin";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    withdrawal: { findUnique: vi.fn(), update: vi.fn() },
    sellerProfile: { update: vi.fn() },
    transaction: { create: vi.fn() },
    auditLog: { create: vi.fn() },
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
  mocks.prisma.withdrawal.findUnique.mockResolvedValue({
    id: "w-1",
    sellerId: "sp-1",
    amount: 500,
    method: "BKASH",
    status: "PENDING",
  });
});

describe("approveWithdrawal", () => {
  it("PAID করে, পেআউট লেজার লেখে, AuditLog করে", async () => {
    await approveWithdrawal("w-1");

    const updateCall = mocks.prisma.withdrawal.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "w-1" });
    expect(updateCall.data.status).toBe("PAID");
    expect(updateCall.data.processedAt).toBeInstanceOf(Date);

    expect(mocks.prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        reference: "wdr-w-1",
        type: "WITHDRAWAL",
        amount: 500,
        method: "BKASH",
        status: "COMPLETED",
        description: "সেলার পেআউট",
        sellerId: "sp-1",
      },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "APPROVE",
        entity: "WITHDRAWAL",
        entityId: "w-1",
        details: { amount: 500 },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/withdrawals");
  });

  it("ইতিমধ্যে প্রসেস করা রিকোয়েস্ট আবার প্রসেস করা যায় না", async () => {
    mocks.prisma.withdrawal.findUnique.mockResolvedValue({
      id: "w-1",
      sellerId: "sp-1",
      amount: 500,
      method: "BKASH",
      status: "PAID",
    });
    await expect(approveWithdrawal("w-1")).rejects.toThrow(
      "ইতিমধ্যে প্রসেস করা হয়েছে"
    );
  });

  it("নন-অ্যাডমিন লগইন পেজে রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "SELLER" } });
    await expect(approveWithdrawal("w-1")).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
  });
});

describe("rejectWithdrawal", () => {
  it("REJECTED করে ও রিজার্ভ করা টাকা ব্যালেন্সে ফেরত দেয়", async () => {
    await rejectWithdrawal("w-1");

    expect(mocks.prisma.withdrawal.update).toHaveBeenCalledWith({
      where: { id: "w-1" },
      data: { status: "REJECTED", processedAt: expect.any(Date) },
    });
    expect(mocks.prisma.sellerProfile.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { balance: { increment: 500 } },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "REJECT",
        entity: "WITHDRAWAL",
        entityId: "w-1",
        details: { amount: 500 },
      },
    });
  });

  it("ইতিমধ্যে প্রসেস করা রিকোয়েস্টে এরর", async () => {
    mocks.prisma.withdrawal.findUnique.mockResolvedValue({
      id: "w-1",
      sellerId: "sp-1",
      amount: 500,
      method: "BKASH",
      status: "REJECTED",
    });
    await expect(rejectWithdrawal("w-1")).rejects.toThrow(
      "ইতিমধ্যে প্রসেস করা হয়েছে"
    );
  });
});
