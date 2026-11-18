// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CheckoutForm } from "./checkout-form";

vi.mock("@/lib/actions/checkout", () => ({
  placeOrder: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/actions/address", () => ({
  addAddressAction: vi.fn().mockResolvedValue({}),
}));

afterEach(() => {
  cleanup();
});

const addr = {
  id: "addr1",
  fullName: "Demo Customer",
  phone: "01700000000",
  division: "Dhaka",
  district: "Dhaka",
  thana: "Dhanmondi",
  addressLine: "House 12, Road 5",
  isDefault: true,
};

describe("CheckoutForm", () => {
  it("ঠিকানা না থাকলে অ্যাড্রেস ফর্ম খোলা ও অর্ডার বাটন ডিসেবল থাকে", () => {
    render(<CheckoutForm addresses={[]} />);
    expect(screen.getByRole("button", { name: "ঠিকানা সংরক্ষণ করুন" })).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "অর্ডার কনফার্ম করুন" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(screen.getByText("অর্ডারের জন্য ঠিকানা প্রয়োজন")).toBeTruthy();
    expect(document.querySelector('input[name="addressId"]')).toBeNull();
  });

  it("ঠিকানা থাকলে ডিফল্ট ঠিকানা অটো-সিলেক্ট হয় ও বাটন এনাবলড থাকে", () => {
    render(<CheckoutForm addresses={[addr]} />);
    const radio = document.querySelector('input[name="addressId"]') as HTMLInputElement;
    expect(radio.value).toBe("addr1");
    const confirm = screen.getByRole("button", { name: "অর্ডার কনফার্ম করুন" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
  });

  it("অ্যাড্রেস সেভের পরে প্রপ আপডেট হলে অটো-সিলেক্ট হয় — বাটন আটকে থাকে না", () => {
    const { rerender } = render(<CheckoutForm addresses={[]} />);
    const confirm = () => screen.getByRole("button", { name: "অর্ডার কনফার্ম করুন" }) as HTMLButtonElement;
    expect(confirm().disabled).toBe(true);

    rerender(<CheckoutForm addresses={[addr]} />);
    expect(confirm().disabled).toBe(false);
    expect((document.querySelector('input[name="addressId"]') as HTMLInputElement).value).toBe("addr1");
    expect(screen.getByText(/Demo Customer/).closest("label")?.className).toContain("border-primary");
  });

  it("সেভ বাটন প্রাইমারি স্টাইলে থাকে — ডিসেবল দেখায় না", () => {
    render(<CheckoutForm addresses={[]} />);
    const save = screen.getByRole("button", { name: "ঠিকানা সংরক্ষণ করুন" }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    expect(save.className).toContain("bg-primary");
  });
});
