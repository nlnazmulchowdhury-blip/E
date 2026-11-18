import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createStaff,
  updateStaffPermissions,
  deleteStaff,
} from "./admin";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    auditLog: { create: vi.fn(), count: vi.fn() },
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

function staffForm(overrides: Record<string, string | string[]> = {}) {
  const fd = new FormData();
  fd.set("name", "রাফি");
  fd.set("email", "rafi@shopdesh.com");
  fd.set("password", "staff123");
  for (const perm of ["products", "orders"]) {
    fd.append("permissions", perm);
  }
  for (const [key, value] of Object.entries(overrides)) {
    fd.delete(key);
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v);
    } else {
      fd.set(key, value);
    }
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
  mocks.prisma.user.findUnique.mockResolvedValue(null);
  mocks.prisma.user.create.mockImplementation(async ({ data }: { data: { name: string; email: string; role: string; permissions: string[] } }) => ({
    id: "staff-1",
    name: data.name,
    email: data.email,
    role: data.role,
    permissions: data.permissions,
  }));
  mocks.prisma.user.update.mockImplementation(async ({ data }: { data: { permissions: string[] } }) => ({
    id: "staff-1",
    permissions: data.permissions,
  }));
  mocks.prisma.user.delete.mockResolvedValue({ id: "staff-1" });
  mocks.prisma.auditLog.count.mockResolvedValue(0);
});

describe("createStaff", () => {
  it("স্টাফ তৈরি করে, পাসওয়ার্ড হ্যাশ করে, অডিট লগে জমা হয়", async () => {
    const result = await createStaff({}, staffForm());

    expect(result).toEqual({ message: "স্টাফ অ্যাকাউন্ট তৈরি হয়েছে" });
    const data = mocks.prisma.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: "রাফি",
      email: "rafi@shopdesh.com",
      role: "STAFF",
      permissions: ["products", "orders"],
    });
    expect(data.password).not.toBe("staff123");
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "CREATE",
        entity: "USER",
        entityId: "staff-1",
        details: { role: "STAFF", permissions: ["products", "orders"] },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/staff");
  });

  it("কোনো পারমিশন না দিলে খালি অ্যারে সেভ হয়", async () => {
    await createStaff({}, staffForm({ permissions: [] }));
    expect(mocks.prisma.user.create.mock.calls[0][0].data.permissions).toEqual([]);
  });

  it("ইমেইল আগে থেকে থাকলে এরর দেখায়", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "x", email: "rafi@shopdesh.com" });
    const result = await createStaff({}, staffForm());
    expect(result.errors?.email).toEqual(["এই ইমেইলে ইতিমধ্যে অ্যাকাউন্ট আছে"]);
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
  });

  it("ভুল ইনপুটে ফিল্ড এরর দেখায়", async () => {
    const result = await createStaff({}, staffForm({ email: "not-an-email", password: "short" }));
    expect(result.errors?.email).toBeTruthy();
    expect(result.errors?.password).toBeTruthy();
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "c-1", role: "CUSTOMER" } });
    await expect(createStaff({}, staffForm())).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
  });
});

describe("updateStaffPermissions", () => {
  it("পারমিশন আপডেট করে অডিট লগে জমা হয়", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "staff-1", role: "STAFF" });
    const result = await updateStaffPermissions("staff-1", {}, staffForm({ permissions: ["coupons"] }));

    expect(result).toEqual({ message: "পারমিশন আপডেট হয়েছে" });
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "staff-1" },
      data: { permissions: ["coupons"] },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "UPDATE",
        entity: "USER",
        entityId: "staff-1",
        details: { permissions: ["coupons"] },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/staff");
  });

  it("স্টাফ না পাওয়া গেলে এরর দেখায়", async () => {
    const result = await updateStaffPermissions("gone", {}, staffForm());
    expect(result.errors?.permissions).toEqual(["স্টাফ খুঁজে পাওয়া যায়নি"]);
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("টার্গেট স্টাফ না হলে এরর দেখায়", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u-1", role: "CUSTOMER" });
    const result = await updateStaffPermissions("u-1", {}, staffForm());
    expect(result.errors?.permissions).toEqual(["স্টাফ খুঁজে পাওয়া যায়নি"]);
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "s-1", role: "STAFF" } });
    await expect(updateStaffPermissions("staff-1", {}, staffForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
  });
});

describe("deleteStaff", () => {
  it("অডিট রেকর্ড না থাকলে স্টাফ ডিলিট হয়", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "staff-1", role: "STAFF" });
    const result = await deleteStaff("staff-1", {});

    expect(result).toEqual({ message: "স্টাফ ডিলিট হয়েছে" });
    expect(mocks.prisma.user.delete).toHaveBeenCalledWith({ where: { id: "staff-1" } });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "DELETE",
        entity: "USER",
        entityId: "staff-1",
        details: { role: "STAFF" },
      },
    });
  });

  it("অডিট রেকর্ড থাকলে ডিলিট ব্লক হয়", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "staff-1", role: "STAFF" });
    mocks.prisma.auditLog.count.mockResolvedValue(3);
    const result = await deleteStaff("staff-1", {});

    expect(result.errors?.form).toEqual(["এই স্টাফের অডিট রেকর্ড থাকায় ডিলিট করা যাবে না"]);
    expect(mocks.prisma.user.delete).not.toHaveBeenCalled();
  });

  it("স্টাফ না পাওয়া গেলে এরর দেখায়", async () => {
    const result = await deleteStaff("gone", {});
    expect(result.errors?.form).toEqual(["স্টাফ খুঁজে পাওয়া যায়নি"]);
    expect(mocks.prisma.user.delete).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "s-1", role: "STAFF" } });
    await expect(deleteStaff("staff-1", {})).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
  });
});
