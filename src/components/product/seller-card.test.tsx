// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockGetSiteSetting } = vi.hoisted(() => ({
  mockGetSiteSetting: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () => ({
    get: (name: string) => (name === "host" ? "shopdesh.test" : null),
  }),
}));
vi.mock("@/lib/site-settings", () => ({
  getSiteSetting: mockGetSiteSetting,
  SITE_SETTING_KEYS: { orderPhone: "site.orderPhone" },
}));

import { SellerCard } from "./seller-card";

const shop = { name: "Demo Store", slug: "demo-store" };

describe("SellerCard", () => {
  it("বিক্রেতার নাম, চ্যাট বাটন, মেট্রিক্স ও শপ-লিংক দেখায়", async () => {
    mockGetSiteSetting.mockResolvedValue("01926841630");
    render(
      await SellerCard({ shop, title: "টেস্ট প্রোডাক্ট", slug: "test-product" })
    );

    expect(screen.getByText("বিক্রেতা")).toBeTruthy();
    expect(screen.getByText("Demo Store")).toBeTruthy();

    const chat = screen.getByRole("link", { name: /চ্যাট করুন/ });
    expect(chat.getAttribute("href")).toContain("wa.me/8801926841630");
    expect(chat.getAttribute("href")).toContain(encodeURIComponent("টেস্ট প্রোডাক্ট"));

    expect(screen.getByText("ইতিবাচক সেলার রেটিং")).toBeTruthy();
    expect(screen.getByText("সময়মতো ডেলিভারি")).toBeTruthy();
    expect(screen.getByText("চ্যাট রেসপন্স রেট")).toBeTruthy();
    expect(screen.getAllByText("যথেষ্ট ডেটা নেই")).toHaveLength(3);

    const store = screen.getByRole("link", { name: "শপ ভিজিট করুন" });
    expect(store.getAttribute("href")).toBe("/shops/demo-store");
  });

  it("শপ না থাকলে কিছু রেন্ডার করে না", async () => {
    const view = await SellerCard({ shop: null, title: "টেস্ট", slug: "t" });
    expect(view).toBeNull();
  });

  it("অর্ডার ফোন সেট না থাকলে কিছু রেন্ডার করে না", async () => {
    mockGetSiteSetting.mockResolvedValue(null);
    const view = await SellerCard({ shop, title: "টেস্ট", slug: "t" });
    expect(view).toBeNull();
  });
});
