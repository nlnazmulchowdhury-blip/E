import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestAdminRole } from "./auth";
import { approveAdminRequest, rejectAdminRequest } from "./admin";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    adminRequest: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    user: { update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => {
      for (const op of ops) await op;
    }),
  },
}));

vi.mock("@/auth", () => ({ auth: mocks.auth, signIn: mocks.signIn }));
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
}));
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

const REASON = "আমি দীর্ঘদিন ধরে ShopDesh কমিউনিটিতে কাজ করছি এবং প্ল্যাটফর্মের দায়িত্ব নিতে চাই";

function reasonForm(reason = REASON) {
  const fd = new FormData();
  fd.set("reason", reason);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "CUSTOMER" } });
  mocks.prisma.adminRequest.upsert.mockResolvedValue({ id: "r-1" });
  mocks.prisma.adminRequest.findUnique.mockResolvedValue({
    id: "r-1",
    userId: "u-1",
    status: "PENDING",
  });
  mocks.prisma.adminRequest.update.mockImplementation(
    async ({ data }: { data: { status: string } }) => ({ id: "r-1", status: data.status })
  );
  mocks.prisma.user.update.mockResolvedValue({ id: "u-1" });
});

describe("requestAdminRole", () => {
  it("রিকোয়েস্ট তৈরি করে ও পেজ রিভ্যালিডেট করে", async () => {
    const result = await requestAdminRole({}, reasonForm());

    expect(result).toEqual({ message: "অনুরোধ পাঠানো হয়েছে — অ্যাডমিন রিভিউ করবে" });
    expect(mocks.prisma.adminRequest.upsert).toHaveBeenCalledWith({
      where: { userId: "u-1" },
      create: { userId: "u-1", reason: REASON },
      update: {
        reason: REASON,
        status: "PENDING",
        createdAt: expect.any(Date),
        reviewedAt: null,
        reviewedById: null,
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/become-admin");
  });

  it("লগইন না থাকলে লগইন পেজে রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requestAdminRole({}, reasonForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/login?callbackUrl=/become-admin");
  });

  it("ইতিমধ্যে অ্যাডমিন হলে এরর দেখায়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "a-1", role: "ADMIN" } });
    const result = await requestAdminRole({}, reasonForm());
    expect(result.errors?.form).toEqual(["আপনি ইতিমধ্যে অ্যাডমিন"]);
    expect(mocks.prisma.adminRequest.upsert).not.toHaveBeenCalled();
  });

  it("কারণ ৫ অক্ষরের কম হলে এরর দেখায়", async () => {
    const result = await requestAdminRole({}, reasonForm("ab"));
    expect(result.errors?.reason).toBeTruthy();
    expect(mocks.prisma.adminRequest.upsert).not.toHaveBeenCalled();
  });
});

describe("approveAdminRequest", () => {
  it("রোল ADMIN করে, স্ট্যাটাস APPROVED, অডিট লগে জমা হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    await approveAdminRequest("r-1");

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { role: "ADMIN" },
    });
    expect(mocks.prisma.adminRequest.update).toHaveBeenCalledWith({
      where: { id: "r-1" },
      data: expect.objectContaining({ status: "APPROVED", reviewedById: "admin-1" }),
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: "admin-1",
        action: "APPROVE",
        entity: "USER",
        entityId: "u-1",
      }),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/staff");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/become-admin");
  });

  it("রিকোয়েস্ট না পেলে এরর থ্রো করে", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.prisma.adminRequest.findUnique.mockResolvedValue(null);
    await expect(approveAdminRequest("gone")).rejects.toThrow("অনুরোধ খুঁজে পাওয়া যায়নি");
  });

  it("ইতিমধ্যে রিভিউ হয়ে গেলে এরর থ্রো করে", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mocks.prisma.adminRequest.findUnique.mockResolvedValue({
      id: "r-1",
      userId: "u-1",
      status: "APPROVED",
    });
    await expect(approveAdminRequest("r-1")).rejects.toThrow("এই অনুরোধ ইতিমধ্যে রিভিউ হয়েছে");
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন রিডাইরেক্ট হয়", async () => {
    await expect(approveAdminRequest("r-1")).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
  });
});

describe("rejectAdminRequest", () => {
  it("স্ট্যাটাস REJECTED করে, অডিট লগে জমা হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });

    await rejectAdminRequest("r-1");

    expect(mocks.prisma.adminRequest.update).toHaveBeenCalledWith({
      where: { id: "r-1" },
      data: expect.objectContaining({ status: "REJECTED", reviewedById: "admin-1" }),
    });
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "REJECT", entity: "USER", entityId: "u-1" }),
    });
  });

  it("নন-অ্যাডমিন রিডাইরেক্ট হয়", async () => {
    await expect(rejectAdminRequest("r-1")).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
  });
});
