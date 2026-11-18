import { describe, it, expect, vi } from "vitest";
import { hasPermission } from "./permissions";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("hasPermission", () => {
  it("ADMIN সব পারমিশন পায়, permissions না থাকলেও", () => {
    expect(hasPermission({ role: "ADMIN" }, "products")).toBe(true);
    expect(hasPermission({ role: "ADMIN", permissions: [] }, "orders")).toBe(true);
    expect(hasPermission({ role: "ADMIN", permissions: null }, "settings")).toBe(true);
  });

  it("STAFF শুধু বরাদ্দকৃত পারমিশন পায়", () => {
    const staff = { role: "STAFF", permissions: ["products", "orders"] };
    expect(hasPermission(staff, "products")).toBe(true);
    expect(hasPermission(staff, "orders")).toBe(true);
    expect(hasPermission(staff, "coupons")).toBe(false);
    expect(hasPermission(staff, "settings")).toBe(false);
  });

  it("STAFF-এর permissions অ্যারেতে না থাকলে false", () => {
    expect(hasPermission({ role: "STAFF", permissions: null }, "products")).toBe(false);
    expect(hasPermission({ role: "STAFF", permissions: [] }, "products")).toBe(false);
    expect(hasPermission({ role: "STAFF" }, "products")).toBe(false);
  });

  it("CUSTOMER/SELLER কোনো অ্যাডমিন পারমিশন পায় না", () => {
    expect(hasPermission({ role: "CUSTOMER", permissions: ["products"] }, "products")).toBe(false);
    expect(hasPermission({ role: "SELLER", permissions: ["orders"] }, "orders")).toBe(false);
  });
});
