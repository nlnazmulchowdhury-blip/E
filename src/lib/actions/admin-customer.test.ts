import { describe, it, expect, vi, beforeEach } from "vitest";
import { suspendCustomer, reactivateCustomer } from "./admin";
import { loginAction } from "./auth";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: mocks.auth, signIn: mocks.signIn }));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
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
  mocks.prisma.user.findUnique.mockResolvedValue({ id: "c-1", status: "ACTIVE" });
  mocks.prisma.user.update.mockResolvedValue({ id: "c-1" });
});

describe("suspendCustomer", () => {
  it("কাস্টমারকে SUSPENDED করে ও AuditLog লেখে", async () => {
    await suspendCustomer("c-1");

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: { status: "SUSPENDED" },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "STATUS_CHANGE",
        entity: "CUSTOMER",
        entityId: "c-1",
        details: { status: "SUSPENDED" },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/customers");
  });

  it("কাস্টমার না পাওয়া গেলে এরর ছোড়ে", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    await expect(suspendCustomer("missing")).rejects.toThrow("কাস্টমার খুঁজে পাওয়া যায়নি");
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন access-denied-এ রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-2", role: "SELLER" } });
    await expect(suspendCustomer("c-1")).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("reactivateCustomer", () => {
  it("কাস্টমারকে ACTIVE করে ও AuditLog লেখে", async () => {
    await reactivateCustomer("c-1");

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: { status: "ACTIVE" },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "STATUS_CHANGE",
        entity: "CUSTOMER",
        entityId: "c-1",
        details: { status: "ACTIVE" },
      },
    });
  });

  it("কাস্টমার না পাওয়া গেলে এরর ছোড়ে", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    await expect(reactivateCustomer("missing")).rejects.toThrow("কাস্টমার খুঁজে পাওয়া যায়নি");
  });
});

describe("loginAction — স্থগিত কাস্টমার", () => {
  function loginForm(email = "suspended@shopdesh.com") {
    const fd = new FormData();
    fd.set("email", email);
    fd.set("password", "customer123");
    return fd;
  }

  it("SUSPENDED কাস্টমার লগইনে স্পষ্ট বার্তা পায়, signIn হয় না", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "c-1",
      email: "suspended@shopdesh.com",
      role: "CUSTOMER",
      status: "SUSPENDED",
    });

    const result = await loginAction({}, loginForm());

    expect(result).toEqual({
      message: "আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে — সাপোর্টে যোগাযোগ করুন",
    });
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("ACTIVE কাস্টমার স্বাভাবিকভাবে signIn হয়", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "c-1",
      email: "active@shopdesh.com",
      role: "CUSTOMER",
      status: "ACTIVE",
    });
    mocks.signIn.mockResolvedValue(undefined);

    await loginAction({}, loginForm("active@shopdesh.com"));

    expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
      email: "active@shopdesh.com",
      password: "customer123",
      redirectTo: "/",
    });
  });
});
