import { describe, it, expect } from "vitest";
import { buildAuditFilter } from "./audit-filter";

describe("buildAuditFilter", () => {
  it("খালি ইনপুটে ফাঁকা ফিল্টার দেয়", () => {
    expect(buildAuditFilter({})).toEqual({});
    expect(buildAuditFilter({ action: "", entity: "", q: "" })).toEqual({});
  });

  it("বৈধ অ্যাকশন ফিল্টারে যায়", () => {
    expect(buildAuditFilter({ action: "APPROVE" })).toEqual({
      action: "APPROVE",
    });
  });

  it("অজানা অ্যাকশন উপেক্ষা হয় (ইনজেকশন প্রতিরোধ)", () => {
    expect(buildAuditFilter({ action: "DROP_TABLE" })).toEqual({});
  });

  it("বৈধ এন্টিটি ফিল্টারে যায়", () => {
    expect(buildAuditFilter({ entity: "SELLER" })).toEqual({ entity: "SELLER" });
  });

  it("অজানা এন্টিটি উপেক্ষা হয়", () => {
    expect(buildAuditFilter({ entity: "HACKER" })).toEqual({});
  });

  it("নাম সার্চ অ্যাডমিন রিলেশনে কেস-ইনসেনসিটিভ খোঁজে", () => {
    expect(buildAuditFilter({ q: "  super  " })).toEqual({
      admin: { name: { contains: "super", mode: "insensitive" } },
    });
  });

  it("সব ফিল্টার একসাথে কাজ করে", () => {
    const where = buildAuditFilter({ action: "CREATE", entity: "PRODUCT", q: "admin" });
    expect(where).toEqual({
      action: "CREATE",
      entity: "PRODUCT",
      admin: { name: { contains: "admin", mode: "insensitive" } },
    });
  });
});
