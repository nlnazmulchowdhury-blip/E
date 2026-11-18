import { describe, it, expect, vi, beforeEach } from "vitest";
import { approveSeller, rejectSeller, suspendSeller, reactivateSeller, deleteSeller } from "./admin";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    sellerProfile: { findUnique: vi.fn(), update: vi.fn() },
    user: { update: vi.fn() },
    auditLog: { create: vi.fn() },
    notification: { create: vi.fn() },
    siteSetting: { findUnique: vi.fn() },
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
  mocks.prisma.sellerProfile.findUnique.mockResolvedValue({
    id: "sp-1",
    userId: "u-1",
    shop: { name: "ঢাকা ফ্যাশন হাউজ" },
  });
  mocks.prisma.sellerProfile.update.mockResolvedValue({ id: "sp-1" });
});

describe("approveSeller", () => {
  it("প্রোফাইল APPROVED করে, verifiedAt সেট করে, রোল SELLER করে, AuditLog লেখে", async () => {
    mocks.prisma.siteSetting.findUnique.mockResolvedValue(null); // ডিফল্ট ৫%

    await approveSeller("sp-1");

    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    const updateCall = mocks.prisma.sellerProfile.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "sp-1" });
    expect(updateCall.data.status).toBe("APPROVED");
    expect(updateCall.data.verifiedAt).toBeInstanceOf(Date);
    expect(updateCall.data.commissionRate).toBe(5);

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { role: "SELLER" },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "APPROVE",
        entity: "SELLER",
        entityId: "sp-1",
        details: { shopName: "ঢাকা ফ্যাশন হাউজ" },
      },
    });
    expect(mocks.prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "u-1",
        title: "শপ অনুমোদিত হয়েছে",
        message:
          'আপনার শপ "ঢাকা ফ্যাশন হাউজ" অনুমোদিত হয়েছে — এখন সেলার প্যানেল থেকে প্রোডাক্ট যোগ করতে পারবেন।',
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/sellers");
  });

  it("গ্লোবাল ডিফল্ট কমিশন সেট থাকলে সেটাই প্রযোজ্য হয়", async () => {
    mocks.prisma.siteSetting.findUnique.mockResolvedValue({
      key: "commission.defaultRate",
      value: 8,
    });

    await approveSeller("sp-1");

    const updateCall = mocks.prisma.sellerProfile.update.mock.calls[0][0];
    expect(updateCall.data.commissionRate).toBe(8);
  });

  it("সেলার না পাওয়া গেলে এরর ছোড়ে", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue(null);
    await expect(approveSeller("missing")).rejects.toThrow("সেলার খুঁজে পাওয়া যায়নি");
  });

  it("নন-অ্যাডমিন লগইন পেজে রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-2", role: "SELLER" } });
    await expect(approveSeller("sp-1")).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
    expect(mocks.prisma.sellerProfile.update).not.toHaveBeenCalled();
  });
});

describe("rejectSeller", () => {
  it("রিজনসহ REJECTED করে, রিজন সেভ করে, নোটিফিকেশন ও AuditLog লেখে", async () => {
    await rejectSeller("sp-1", "শপের নাম ও তথ্যের মিল নেই, সঠিক তথ্য দিন");

    expect(mocks.prisma.sellerProfile.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { status: "REJECTED", rejectionReason: "শপের নাম ও তথ্যের মিল নেই, সঠিক তথ্য দিন" },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "REJECT",
        entity: "SELLER",
        entityId: "sp-1",
        details: { reason: "শপের নাম ও তথ্যের মিল নেই, সঠিক তথ্য দিন" },
      },
    });
    expect(mocks.prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "u-1",
        title: "শপের আবেদন বাতিল হয়েছে",
        message:
          "দুঃখিত, আপনার শপের আবেদনটি বাতিল করা হয়েছে। কারণ: শপের নাম ও তথ্যের মিল নেই, সঠিক তথ্য দিন তথ্য ঠিক করে আবার আবেদন করতে পারবেন।",
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/sellers");
  });

  it("রিজন ৫ অক্ষরের কম হলে এরর ছোড়ে, কিছু আপডেট হয় না", async () => {
    await expect(rejectSeller("sp-1", "ভুল")).rejects.toThrow(
      "বাতিলের কারণ দিন (কমপক্ষে ৫ অক্ষর)"
    );
    expect(mocks.prisma.sellerProfile.update).not.toHaveBeenCalled();
    expect(mocks.prisma.notification.create).not.toHaveBeenCalled();
  });

  it("রিজন ৫০০ অক্ষরের বেশি হলে এরর ছোড়ে", async () => {
    await expect(rejectSeller("sp-1", "ক".repeat(501))).rejects.toThrow(
      "বাতিলের কারণ সর্বোচ্চ ৫০০ অক্ষর হতে পারবে"
    );
    expect(mocks.prisma.sellerProfile.update).not.toHaveBeenCalled();
  });

  it("সেলার না পাওয়া গেলে এরর ছোড়ে", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue(null);
    await expect(rejectSeller("missing", "যথেষ্ট কারণ আছে এখানে")).rejects.toThrow(
      "সেলার খুঁজে পাওয়া যায়নি"
    );
  });

  it("নন-অ্যাডমিন access-denied-এ রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-2", role: "STAFF" } });
    await expect(
      rejectSeller("sp-1", "যথেষ্ট কারণ আছে এখানে")
    ).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
  });
});

describe("suspendSeller", () => {
  it("প্রোফাইল SUSPENDED করে ও AuditLog লেখে", async () => {
    await suspendSeller("sp-1");

    expect(mocks.prisma.sellerProfile.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { status: "SUSPENDED" },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "STATUS_CHANGE",
        entity: "SELLER",
        entityId: "sp-1",
        details: { status: "SUSPENDED" },
      },
    });
    expect(mocks.prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "u-1",
        title: "শপ সাময়িকভাবে স্থগিত",
        message:
          "আপনার শপ সাময়িকভাবে স্থগিত করা হয়েছে। বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।",
      },
    });
  });
});

describe("reactivateSeller", () => {
  it("প্রোফাইল APPROVED করে ও রোল SELLER করে", async () => {
    await reactivateSeller("sp-1");

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { role: "SELLER" },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "STATUS_CHANGE",
        entity: "SELLER",
        entityId: "sp-1",
        details: { status: "APPROVED" },
      },
    });
    expect(mocks.prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "u-1",
        title: "শপ পুনরায় চালু হয়েছে",
        message: "আপনার শপ আবার সক্রিয় করা হয়েছে — সেলার প্যানেলে স্বাগতম।",
      },
    });
  });

  it("সেলার না পাওয়া গেলে এরর ছোড়ে", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue(null);
    await expect(reactivateSeller("missing")).rejects.toThrow("সেলার খুঁজে পাওয়া যায়নি");
  });

  it("পুনরায় চালু করলে deletedAt ক্লিয়ার হয়", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({
      id: "sp-1",
      userId: "u-1",
      deletedAt: new Date("2026-11-17T10:00:00Z"),
    });

    await reactivateSeller("sp-1");

    const updateCall = mocks.prisma.sellerProfile.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe("APPROVED");
    expect(updateCall.data.deletedAt).toBeNull();
  });
});

describe("deleteSeller", () => {
  it("soft delete করে — deletedAt + SUSPENDED, AuditLog DELETE লেখে", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({
      id: "sp-1",
      userId: "u-1",
      deletedAt: null,
      shop: { name: "ঢাকা ফ্যাশন হাউজ" },
    });

    await deleteSeller("sp-1");

    const updateCall = mocks.prisma.sellerProfile.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "sp-1" });
    expect(updateCall.data.status).toBe("SUSPENDED");
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "DELETE",
        entity: "SELLER",
        entityId: "sp-1",
        details: { shopName: "ঢাকা ফ্যাশন হাউজ", softDelete: true },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/sellers");
  });

  it("আগে থেকেই ডিলিটেড হলে এরর ছোড়ে", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({
      id: "sp-1",
      deletedAt: new Date(),
      shop: null,
    });
    await expect(deleteSeller("sp-1")).rejects.toThrow("এই সেলার ইতিমধ্যে ডিলিট করা হয়েছে");
    expect(mocks.prisma.sellerProfile.update).not.toHaveBeenCalled();
  });

  it("সেলার না পাওয়া গেলে এরর ছোড়ে", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue(null);
    await expect(deleteSeller("missing")).rejects.toThrow("সেলার খুঁজে পাওয়া যায়নি");
  });

  it("নন-অ্যাডমিন access-denied-এ রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-2", role: "STAFF" } });
    await expect(deleteSeller("sp-1")).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
  });
});
