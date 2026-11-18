// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { QuantitySelector } from "./quantity-selector";
import { ProductGallery } from "./product-gallery";

const { mockAddToCart, mockPush } = vi.hoisted(() => ({
  mockAddToCart: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock("@/lib/actions/cart", () => ({ addToCart: mockAddToCart }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AddToCartButton } from "./add-to-cart-button";

beforeEach(() => {
  vi.clearAllMocks();
  mockAddToCart.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

describe("QuantitySelector", () => {
  it("বাড়ায় ও কমায়", () => {
    let value = 2;
    const onChange = (v: number) => {
      value = v;
    };
    const { rerender } = render(
      <QuantitySelector value={value} onChange={onChange} max={5} />
    );
    fireEvent.click(screen.getByRole("button", { name: "পরিমাণ বাড়ান" }));
    expect(value).toBe(3);
    rerender(<QuantitySelector value={value} onChange={onChange} max={5} />);
    fireEvent.click(screen.getByRole("button", { name: "পরিমাণ কমান" }));
    expect(value).toBe(2);
  });

  it("min-এর নিচে কমায় না, max-এর উপরে বাড়ায় না", () => {
    let value = 1;
    const onChange = (v: number) => {
      value = v;
    };
    const { rerender } = render(
      <QuantitySelector value={value} onChange={onChange} max={3} />
    );
    fireEvent.click(screen.getByRole("button", { name: "পরিমাণ কমান" }));
    expect(value).toBe(1);

    value = 3;
    rerender(<QuantitySelector value={value} onChange={onChange} max={3} />);
    fireEvent.click(screen.getByRole("button", { name: "পরিমাণ বাড়ান" }));
    expect(value).toBe(3);
  });
});

describe("ProductGallery", () => {
  const twoImages = [
    { id: "1", url: "/a.jpg", alt: "A" },
    { id: "2", url: "/b.jpg", alt: "B" },
  ];

  it("থাম্বনেইল ক্লিকে মূল ছবি বদলায়", () => {
    render(<ProductGallery images={twoImages} title="Test" />);
    const main = document.querySelector('img[class*="aspect-"]') as HTMLImageElement;
    expect(main.src).toContain("/a.jpg");
    fireEvent.click(screen.getByRole("button", { name: "ছবি 2" }));
    expect(main.src).toContain("/b.jpg");
  });

  it("অ্যারো ক্লিকে পরের ও আগের ছবি আসে, অ্যাক্টিভ থাম্ব বদলায়", () => {
    render(<ProductGallery images={twoImages} title="Test" />);
    const main = document.querySelector('img[class*="aspect-"]') as HTMLImageElement;

    expect(screen.getByRole("button", { name: "ছবি 1" }).className).toContain("border-primary");

    fireEvent.click(screen.getByRole("button", { name: "পরের ছবি" }));
    expect(main.src).toContain("/b.jpg");
    expect(screen.getByRole("button", { name: "ছবি 2" }).className).toContain("border-primary");
    expect(screen.getByRole("button", { name: "ছবি 1" }).className).not.toContain("border-primary");

    fireEvent.click(screen.getByRole("button", { name: "আগের ছবি" }));
    expect(main.src).toContain("/a.jpg");
    expect(screen.getByRole("button", { name: "ছবি 1" }).className).toContain("border-primary");
  });

  it("একটি ছবি থাকলে থাম্বনেইল ও অ্যারো দেখায় না", () => {
    render(<ProductGallery images={[{ id: "1", url: "/a.jpg" }]} title="Test" />);
    expect(screen.queryByRole("button", { name: /ছবি/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "পরের ছবি" })).toBeNull();
    expect(screen.queryByRole("button", { name: "আগের ছবি" })).toBeNull();
  });
});

describe("AddToCartButton", () => {
  it("সাধারণ মোডে addToCart কল করে, redirect করে না", async () => {
    render(<AddToCartButton productId="p1" quantity={2} />);
    fireEvent.click(screen.getByRole("button", { name: /কার্টে যোগ করুন/ }));
    await waitFor(() => expect(mockAddToCart).toHaveBeenCalledWith("p1", 2));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("buyNow মোডে addToCart-এর পর /checkout-এ যায়", async () => {
    render(<AddToCartButton productId="p1" quantity={3} buyNow />);
    fireEvent.click(screen.getByRole("button", { name: /এখনই কিনুন/ }));
    await waitFor(() => expect(mockAddToCart).toHaveBeenCalledWith("p1", 3));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/checkout"));
  });
});
