import { describe, expect, it } from "vitest";
import { telLink, toIntlPhone, whatsappLink } from "@/lib/phone";

describe("toIntlPhone", () => {
  it("লোকাল BD নম্বরকে আন্তর্জাতিক ফরম্যাটে নেয়", () => {
    expect(toIntlPhone("01926841630")).toBe("8801926841630");
  });

  it("880-প্রিফিক্স ও +880-প্রিফিক্স নম্বরও ঠিক রাখে", () => {
    expect(toIntlPhone("8801926841630")).toBe("8801926841630");
    expect(toIntlPhone("+8801926841630")).toBe("8801926841630");
  });

  it("স্পেস ও ড্যাশ উপেক্ষা করে", () => {
    expect(toIntlPhone("017 1234 5678")).toBe("8801712345678");
    expect(toIntlPhone("01712-345678")).toBe("8801712345678");
  });

  it("ভুল ফরম্যাটে null দেয়", () => {
    expect(toIntlPhone("12345")).toBeNull();
    expect(toIntlPhone("447123456789")).toBeNull();
    expect(toIntlPhone("")).toBeNull();
  });
});

describe("telLink", () => {
  it("tel: লিংক বানায়", () => {
    expect(telLink("01926841630")).toBe("tel:+8801926841630");
  });

  it("ভুল নম্বরে null দেয়", () => {
    expect(telLink("abc")).toBeNull();
  });
});

describe("whatsappLink", () => {
  it("wa.me লিংক বানায় এবং মেসেজ URL-এনকোড করে", () => {
    const link = whatsappLink("01926841630", "হ্যালো ওয়ার্ল্ড");
    expect(link).toContain("https://wa.me/8801926841630?text=");
    expect(decodeURIComponent(link!.split("text=")[1])).toBe("হ্যালো ওয়ার্ল্ড");
  });

  it("ভুল নম্বরে null দেয়", () => {
    expect(whatsappLink("xyz", "hello")).toBeNull();
  });
});
