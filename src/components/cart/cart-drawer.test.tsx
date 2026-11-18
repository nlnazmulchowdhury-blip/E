// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CartDrawer, CartTrigger } from "./cart-drawer";

const { mockUpdate, mockRemove } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockRemove: vi.fn(),
}));

vi.mock("@/lib/actions/cart", () => ({
  updateCartQuantity: mockUpdate,
  removeFromCart: mockRemove,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const items = [
  {
    id: "ci1",
    productId: "p1",
    quantity: 2,
    stock: 25,
    title: "Smartphone X200 Pro 5G",
    slug: "smartphone-x200-pro-5g",
    imageUrl: "/a.jpg",
    unitPrice: 750,
    originalPrice: 1000,
  },
  {
    id: "ci2",
    productId: "p2",
    quantity: 1,
    stock: 5,
    title: "হেডফোন ওয়্যারলেস",
    slug: "headphone-wireless",
    imageUrl: "/b.jpg",
    unitPrice: 500,
    originalPrice: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate.mockResolvedValue(undefined);
  mockRemove.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

describe("CartDrawer", () => {
  it("শুরুতে বন্ধ থাকে", () => {
    render(<CartDrawer items={[]} />);
    expect(screen.queryByText("SHOPPING CART")).toBeNull();
  });

  it("ট্রিগার ক্লিকে খোলে এবং খালি কার্টে রেফারেন্স টেক্সট দেখায়", () => {
    render(
      <>
        <CartTrigger count={0} label="কার্ট" />
        <CartDrawer items={[]} />
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: "কার্ট" }));
    expect(screen.getByText("SHOPPING CART")).toBeTruthy();
    expect(screen.getByText("No items in your cart!")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("Close-এ ক্লিকে বন্ধ হয়", () => {
    render(
      <>
        <CartTrigger count={0} label="কার্ট" />
        <CartDrawer items={[]} />
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: "কার্ট" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("SHOPPING CART")).toBeNull();
  });

  it("আইটেম, দাম, সাবটোটাল ও চেকআউট লিংক দেখায়", () => {
    render(
      <>
        <CartTrigger count={3} label="কার্ট" />
        <CartDrawer items={items} />
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: "কার্ট" }));
    expect(screen.getByText("Smartphone X200 Pro 5G")).toBeTruthy();
    expect(screen.getByText("হেডফোন ওয়্যারলেস")).toBeTruthy();
    expect(screen.getByText("৳750")).toBeTruthy();
    expect(screen.getByText("৳1,000")).toBeTruthy();
    expect(screen.getAllByText("৳500")).toHaveLength(2);
    expect(screen.getByText("৳1,500")).toBeTruthy();
    expect(screen.getByText("৳2,000")).toBeTruthy();
    const checkout = screen.getByRole("link", { name: "চেকআউট করুন" });
    expect(checkout.getAttribute("href")).toBe("/checkout");
    const cartPage = screen.getByRole("link", { name: "কার্ট পেজে দেখুন" });
    expect(cartPage.getAttribute("href")).toBe("/cart");
  });
});

describe("CartTrigger", () => {
  it("ব্যাজে সংখ্যা দেখায়, ৯৯+ ক্যাপ করে", () => {
    const { rerender } = render(<CartTrigger count={3} label="কার্ট" />);
    expect(screen.getByText("3")).toBeTruthy();
    rerender(<CartTrigger count={150} label="কার্ট" />);
    expect(screen.getByText("99+")).toBeTruthy();
  });
});
