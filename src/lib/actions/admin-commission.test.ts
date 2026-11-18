import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateDefaultCommission, updateCommissionRate } from "./admin";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    siteSetting: { upsert: vi.fn() },
    sellerProfile: { findUnique: vi.fn(), update: vi.fn() },
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

function form(rate: string) {
  const fd = new FormData();
  fd.set("rate", rate);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
  mocks.prisma.siteSetting.upsert.mockResolvedValue({ key: "x", value: 5 });
});

describe("updateDefaultCommission", () => {
  it("SiteSetting-এ ডিফল্ট হার upsert করে + AuditLog", async () => {
    const res = await updateDefaultCommission({}, form("7.5"));

    expect(res.message).toContain("আপডেট");
    expect(mocks.prisma.siteSetting.upsert).toHaveBeenCalledWith({
      where: { key: "commission.defaultRate" },
      update: { value: 7.5 },
      create: { key: "commission.defaultRate", value: 7.5 },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE",
        entity: "SETTING",
      }),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/commission");
  });

  it("১০০-এর বেশি হার বাতিল হয়", async () => {
    const res = await updateDefaultCommission({}, form("150"));

    expect(res.errors?.rate).toBeDefined();
    expect(mocks.prisma.siteSetting.upsert).not.toHaveBeenCalled();
  });

  it("সাংখ্যিক নয় এমন মান বাতিল হয়", async () => {
    const res = await updateDefaultCommission({}, form("abc"));

    expect(res.errors?.rate).toBeDefined();
    expect(mocks.prisma.siteSetting.upsert).not.toHaveBeenCalled();
  });
});

describe("updateCommissionRate", () => {
  it("সেলারের হার আপডেট করে + AuditLog", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({ id: "sp-1" });

    const res = await updateCommissionRate("sp-1", {}, form("12"));

    expect(res.message).toContain("আপডেট");
    expect(mocks.prisma.sellerProfile.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: { commissionRate: 12 },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE",
        entity: "COMMISSION",
        entityId: "sp-1",
      }),
    });
  });

  it("সেলার না থাকলে আপডেট হয় না", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue(null);

    const res = await updateCommissionRate("missing", {}, form("10"));

    expect(res.message).toContain("খুঁজে পাওয়া যায়নি");
    expect(mocks.prisma.sellerProfile.update).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন লগইনে পাঠায়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1", role: "SELLER" } });

    await expect(updateDefaultCommission({}, form("5"))).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
  });
});
