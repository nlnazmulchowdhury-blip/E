import { describe, it, expect, vi, beforeEach } from "vitest";
import { markNotificationRead, markAllNotificationsRead } from "./notifications";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    notification: { updateMany: vi.fn() },
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
  mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "CUSTOMER" } });
  mocks.prisma.notification.updateMany.mockResolvedValue({ count: 1 });
});

describe("markNotificationRead", () => {
  it("শুধু নিজের নোটিফিকেশনই পঠিত করতে পারে (id + userId দুটোই ম্যাচ)", async () => {
    await markNotificationRead("n-1");

    expect(mocks.prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "n-1", userId: "u-1" },
      data: { read: true },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/account/notifications");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("লগইন না থাকলে লগইন পেজে রিডাইরেক্ট", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(markNotificationRead("n-1")).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.prisma.notification.updateMany).not.toHaveBeenCalled();
  });
});

describe("markAllNotificationsRead", () => {
  it("নিজের সব অপঠিত নোটিফিকেশন পঠিত করে", async () => {
    await markAllNotificationsRead();

    expect(mocks.prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "u-1", read: false },
      data: { read: true },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/account/notifications");
  });

  it("লগইন না থাকলে লগইন পেজে রিডাইরেক্ট", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(markAllNotificationsRead()).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.prisma.notification.updateMany).not.toHaveBeenCalled();
  });
});
