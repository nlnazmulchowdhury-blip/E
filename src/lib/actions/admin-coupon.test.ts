import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createCoupon,
  updateCoupon,
  toggleCoupon,
  deleteCoupon,
} from "./admin";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    coupon: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
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

function form(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const defaults: Record<string, string> = {
    code: "WELCOME10",
    type: "PERCENT",
    value: "10",
    minOrderAmount: "1000",
    maxUses: "100",
    startsAt: "",
    endsAt: "",
    isActive: "on",
  };
  for (const [k, v] of Object.entries({ ...defaults, ...overrides })) {
    fd.set(k, v);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
  mocks.prisma.coupon.create.mockResolvedValue({ id: "c1", code: "WELCOME10" });
  mocks.prisma.coupon.update.mockResolvedValue({ id: "c1", code: "WELCOME10" });
});

describe("কুপন CRUD অ্যাকশন", () => {
  it("createCoupon — কোড আপারকেসে তৈরি + AuditLog", async () => {
    await createCoupon({}, form());

    expect(mocks.prisma.coupon.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "WELCOME10",
        type: "PERCENT",
        value: 10,
        minOrderAmount: 1000,
        maxUses: 100,
        isActive: true,
      }),
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "CREATE", entity: "COUPON" }),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/coupons");
  });

  it("createCoupon — ছোট কোড বাতিল হয়", async () => {
    const res = await createCoupon({}, form({ code: "AB" }));

    expect(res.errors?.code).toBeDefined();
    expect(mocks.prisma.coupon.create).not.toHaveBeenCalled();
  });

  it("createCoupon — PERCENT ১০০-এর বেশি বাতিল হয়", async () => {
    const res = await createCoupon({}, form({ value: "150" }));

    expect(res.errors?.value?.[0]).toContain("১০০");
    expect(mocks.prisma.coupon.create).not.toHaveBeenCalled();
  });

  it("createCoupon — ডুপ্লিকেট কোডে এরর (P2002)", async () => {
    mocks.prisma.coupon.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "6",
      })
    );

    const res = await createCoupon({}, form());

    expect(res.errors?.code?.[0]).toContain("আগে থেকেই");
  });

  it("createCoupon — খালি মেয়াদ/সর্বনিম্ন অর্ডার null হয়", async () => {
    await createCoupon({}, form({ minOrderAmount: "", maxUses: "" }));

    expect(mocks.prisma.coupon.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        minOrderAmount: null,
        maxUses: null,
        startsAt: null,
        endsAt: null,
      }),
    });
  });

  it("updateCoupon — আপডেট + AuditLog", async () => {
    await updateCoupon("c1", {}, form({ value: "15" }));

    expect(mocks.prisma.coupon.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: expect.objectContaining({ value: 15 }),
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "UPDATE", entity: "COUPON" }),
    });
  });

  it("toggleCoupon — isActive উল্টে যায়", async () => {
    mocks.prisma.coupon.findUnique.mockResolvedValue({ id: "c1", isActive: true });

    await toggleCoupon("c1");

    expect(mocks.prisma.coupon.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { isActive: false },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "STATUS_CHANGE", entity: "COUPON" }),
    });
  });

  it("deleteCoupon — ডিলিট + AuditLog", async () => {
    await deleteCoupon("c1");

    expect(mocks.prisma.coupon.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "DELETE", entity: "COUPON" }),
    });
  });

  it("নন-অ্যাডমিনকে লগইনে পাঠায়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u1", role: "CUSTOMER" } });

    await expect(createCoupon({}, form())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
  });
});
