import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateShipment } from "./admin";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    shipment: { update: vi.fn() },
    order: { findUnique: vi.fn() },
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
vi.mock("@/lib/actions/orders", () => ({
  updateOrderStatus: vi.fn(),
}));
vi.mock("@/lib/format", () => ({
  slugify: (s: string) => s,
  formatBDT: (n: number) => `৳${n}`,
}));

function form(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("status", "IN_TRANSIT");
  fd.set("partner", "PATHOA");
  fd.set("trackingCode", "TRK123");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
  mocks.prisma.order.findUnique.mockResolvedValue({ id: "sub-1" });
  mocks.prisma.shipment.update.mockResolvedValue({ id: "sh-1" });
});

describe("updateShipment", () => {
  it("পার্টনার/ট্র্যাকিং/স্ট্যাটাস আপডেট করে ও AuditLog লেখে", async () => {
    const result = await updateShipment("sub-1", {}, form());

    expect(mocks.prisma.shipment.update).toHaveBeenCalledWith({
      where: { orderId: "sub-1" },
      data: {
        partner: "PATHOA",
        trackingCode: "TRK123",
        status: "IN_TRANSIT",
        shippedAt: expect.any(Date),
        deliveredAt: undefined,
      },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "UPDATE",
        entity: "SHIPMENT",
        entityId: "sub-1",
        details: { partner: "PATHOA", trackingCode: "TRK123", status: "IN_TRANSIT" },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/orders");
    expect(result.message).toBe("শিপমেন্ট আপডেট হয়েছে");
  });

  it("DELIVERED হলে deliveredAt সেট হয়", async () => {
    await updateShipment("sub-1", {}, form({ status: "DELIVERED" }));
    const call = mocks.prisma.shipment.update.mock.calls[0][0];
    expect(call.data.deliveredAt).toBeInstanceOf(Date);
    expect(call.data.shippedAt).toBeUndefined();
  });

  it("পার্টনার খালি রাখলে null হয়", async () => {
    await updateShipment("sub-1", {}, form({ partner: "" }));
    const call = mocks.prisma.shipment.update.mock.calls[0][0];
    expect(call.data.partner).toBeNull();
  });

  it("অবৈধ স্ট্যাটাসে এরর", async () => {
    const result = await updateShipment("sub-1", {}, form({ status: "FLYING" }));
    expect(result.errors?.status?.[0]).toBe("অবৈধ শিপমেন্ট স্ট্যাটাস");
    expect(mocks.prisma.shipment.update).not.toHaveBeenCalled();
  });

  it("অবৈধ পার্টনারে এরর", async () => {
    const result = await updateShipment("sub-1", {}, form({ partner: "DRONE" }));
    expect(result.errors?.partner?.[0]).toBe("অবৈধ ডেলিভারি পার্টনার");
    expect(mocks.prisma.shipment.update).not.toHaveBeenCalled();
  });

  it("অর্ডার না পাওয়া গেলে মেসেজ দেয়", async () => {
    mocks.prisma.order.findUnique.mockResolvedValue(null);
    const result = await updateShipment("missing", {}, form());
    expect(result.message).toBe("অর্ডার খুঁজে পাওয়া যায়নি");
    expect(mocks.prisma.shipment.update).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন লগইন পেজে রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-2", role: "SELLER" } });
    await expect(updateShipment("sub-1", {}, form())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
    expect(mocks.prisma.shipment.update).not.toHaveBeenCalled();
  });
});
