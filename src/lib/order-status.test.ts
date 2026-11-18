import { describe, it, expect } from "vitest";
import {
  computeParentStatus,
  ORDER_STATUS_LABELS,
  ALLOWED_TRANSITIONS,
  TRANSITION_LABELS,
} from "./order-status";

describe("computeParentStatus", () => {
  it("খালি সাব-অর্ডার হলে PENDING", () => {
    expect(computeParentStatus([])).toBe("PENDING");
  });

  it("সব সাব CANCELLED হলে প্যারেন্ট CANCELLED", () => {
    expect(computeParentStatus(["CANCELLED", "CANCELLED"])).toBe("CANCELLED");
  });

  it("সব সাব REFUNDED হলে প্যারেন্ট REFUNDED", () => {
    expect(computeParentStatus(["REFUNDED", "REFUNDED"])).toBe("REFUNDED");
  });

  it("কোনো একটি সাব RETURNED হলে প্যারেন্ট RETURNED", () => {
    expect(computeParentStatus(["DELIVERED", "RETURNED", "DELIVERED"])).toBe("RETURNED");
  });

  it("মিশ্র স্ট্যাটাসে সবচেয়ে পেছনের ধাপ", () => {
    expect(computeParentStatus(["CONFIRMED", "SHIPPED", "CONFIRMED"])).toBe("CONFIRMED");
  });

  it("সব সাব DELIVERED হলে প্যারেন্ট DELIVERED", () => {
    expect(computeParentStatus(["DELIVERED", "DELIVERED"])).toBe("DELIVERED");
  });

  it("CANCELLED বাদ দিয়ে বাকিগুলোর মধ্যে সর্বনিম্ন ধাপ", () => {
    expect(computeParentStatus(["CANCELLED", "PROCESSING", "DELIVERED"])).toBe("PROCESSING");
  });

  it("সব সাব CANCELLED বা REFUNDED মিশ্র হলে CANCELLED", () => {
    expect(computeParentStatus(["CANCELLED", "REFUNDED"])).toBe("CANCELLED");
  });
});

describe("ORDER_STATUS_LABELS", () => {
  it("৯টি স্ট্যাটাসের বাংলা লেবেল আছে", () => {
    const keys = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "PACKED",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "RETURNED",
      "REFUNDED",
    ] as const;
    for (const k of keys) {
      expect(ORDER_STATUS_LABELS[k]).toBeTruthy();
    }
  });
});

describe("ALLOWED_TRANSITIONS + TRANSITION_LABELS", () => {
  it("প্রতিটি অনুমোদিত ট্রানজিশনের বাটন লেবেল আছে", () => {
    for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const to of targets) {
        expect(TRANSITION_LABELS[to], `${from} → ${to} লেবেল নেই`).toBeTruthy();
      }
    }
  });

  it("টার্মিনাল স্ট্যাটাস থেকে কোনো ট্রানজিশন নেই", () => {
    expect(ALLOWED_TRANSITIONS.CANCELLED).toEqual([]);
    expect(ALLOWED_TRANSITIONS.REFUNDED).toEqual([]);
  });

  it("PENDING থেকে CONFIRMED বা CANCELLED যাওয়া যায়", () => {
    expect(ALLOWED_TRANSITIONS.PENDING).toEqual(["CONFIRMED", "CANCELLED"]);
  });
});
