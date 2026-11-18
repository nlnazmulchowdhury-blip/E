import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/format";

describe("slugify", () => {
  it("ইংরেজি টাইটেল স্লাগে রূপান্তর করে", () => {
    expect(slugify("Panjabi Premium Cotton")).toBe("panjabi-premium-cotton");
  });

  it("বাংলা অক্ষর রেখে দেয় যাতে স্লাগ খালি না হয়", () => {
    expect(slugify("টেস্ট প্রোডাক্ট হেডফোন")).toBe("টেস্ট-প্রোডাক্ট-হেডফোন");
  });

  it("মিশ্র বাংলা-ইংরেজি কাজ করে", () => {
    expect(slugify("Samsung Galaxy ৫জি ফোন")).toBe("samsung-galaxy-৫জি-ফোন");
  });

  it("বিশেষ চিহ্ন বাদ দেয় ও স্পেস হাইফেন করে", () => {
    expect(slugify("  Hello, World!! 2026 ")).toBe("hello-world-2026");
  });

  it("শুধু ইমোজি থাকলে ফ্যালব্যাক স্লাগ দেয়", () => {
    expect(slugify("🎧🎧")).toMatch(/^item-[a-z0-9]+$/);
  });
});
