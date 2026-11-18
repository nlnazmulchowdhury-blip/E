// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import bn from "@/messages/bn.json";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    scrollNext: vi.fn(),
    scrollTo: vi.fn(),
    selectedScrollSnap: vi.fn(() => 0),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock("embla-carousel-react", () => ({
  __esModule: true,
  default: () => [{ current: null }, mockApi],
}));

import { HeroSlider } from "./hero-slider";

const images = [
  { url: "/a.jpg", title: "Image A" },
  { url: "/b.jpg", title: "Image B" },
  { url: "/c.jpg", title: "Image C" },
];

function renderSlider() {
  return render(
    <NextIntlClientProvider locale="bn" messages={bn}>
      <HeroSlider images={images} banners={[]} />
    </NextIntlClientProvider>
  );
}

function renderSliderEmpty() {
  return render(
    <NextIntlClientProvider locale="bn" messages={bn}>
      <HeroSlider images={[]} banners={[]} />
    </NextIntlClientProvider>
  );
}

describe("HeroSlider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockApi.selectedScrollSnap.mockReturnValue(0);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("তিনটি স্লাইড ও তিনটি ডট রেন্ডার করে", () => {
    renderSlider();
    expect(screen.getByText(/এক ক্লিকেই ঘরে/)).toBeTruthy();
    expect(screen.getByText("WELCOME10")).toBeTruthy();
    expect(screen.getByText(/নিরাপদ পেমেন্ট/)).toBeTruthy();
    expect(screen.getByLabelText("স্লাইড 1")).toBeTruthy();
    expect(screen.getByLabelText("স্লাইড 2")).toBeTruthy();
    expect(screen.getByLabelText("স্লাইড 3")).toBeTruthy();
  });

  it("প্রতি ৫ সেকেন্ডে অটোপ্লে scrollNext ডাকে", () => {
    renderSlider();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockApi.scrollNext).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockApi.scrollNext).toHaveBeenCalledTimes(2);
  });

  it("মাউস হোভারে অটোপ্লে থেমে যায়, ছাড়লে আবার চালু হয়", () => {
    renderSlider();
    const section = screen.getByText(/এক ক্লিকেই ঘরে/).closest("section");
    fireEvent.mouseEnter(section!);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(mockApi.scrollNext).not.toHaveBeenCalled();
    fireEvent.mouseLeave(section!);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockApi.scrollNext).toHaveBeenCalledTimes(1);
  });

  it("ডট ক্লিকে সঠিক স্লাইডে scrollTo হয়", () => {
    renderSlider();
    fireEvent.click(screen.getByLabelText("স্লাইড 3"));
    expect(mockApi.scrollTo).toHaveBeenCalledWith(2);
  });

  it("select ইভেন্টে অ্যাক্টিভ ডট আপডেট হয়", () => {
    renderSlider();
    const selectHandler = mockApi.on.mock.calls.find(([ev]) => ev === "select")?.[1];
    expect(selectHandler).toBeTypeOf("function");
    mockApi.selectedScrollSnap.mockReturnValue(1);
    act(() => {
      selectHandler();
    });
    const dot2 = screen.getByLabelText("স্লাইড 2");
    expect(dot2.className).toContain("bg-primary");
    expect(dot2.className).toContain("w-6");
  });

  it("কম ছবি থাকলে র্যাপঅ্যারাউন্ড করে প্রতিটি স্লাইডে ৩টি ছবি দেখায়", () => {
    renderSlider();
    const track = document.querySelector(".overflow-hidden")!.firstElementChild!;
    const slides = Array.from(track.children);
    expect(slides).toHaveLength(3);
    const alts = (i: number) =>
      Array.from(slides[i].querySelectorAll("img")).map((img) => img.alt);
    expect(alts(0)).toEqual(["Image A", "Image B", "Image C"]);
    expect(alts(1)).toEqual(["Image B", "Image C", "Image A"]);
    expect(alts(2)).toEqual(["Image C", "Image A", "Image B"]);
  });

  it("ছবি না থাকলেও স্লাইডার ক্র্যাশ করে না", () => {
    renderSliderEmpty();
    expect(screen.getByText(/এক ক্লিকেই ঘরে/)).toBeTruthy();
    expect(screen.getByText("WELCOME10")).toBeTruthy();
  });

  it("HERO ব্যানার স্ট্যাটিক স্লাইডের পরে ব্যানার স্লাইড হিসেবে রেন্ডার হয়", () => {
    render(
      <NextIntlClientProvider locale="bn" messages={bn}>
        <HeroSlider
          images={images}
          banners={[
            {
              id: "b1",
              title: "ঈদ স্পেশাল অফার",
              subtitle: "২০% ছাড়",
              imageUrl: "/banner.jpg",
              linkUrl: "/categories/fashion",
            },
          ]}
        />
      </NextIntlClientProvider>
    );
    const track = document.querySelector(".overflow-hidden")!.firstElementChild!;
    const slides = Array.from(track.children);
    expect(slides).toHaveLength(4);
    expect(screen.getByText("ঈদ স্পেশাল অফার")).toBeTruthy();
    expect(screen.getByText("২০% ছাড়")).toBeTruthy();
    const bannerImg = slides[3].querySelector("img");
    expect(bannerImg?.getAttribute("src")).toBe("/banner.jpg");
    const link = (screen.getByText("ঈদ স্পেশাল অফার").closest("div") as HTMLElement)
      .querySelector("a");
    expect(link?.getAttribute("href")).toBe("/categories/fashion");
  });

  it("টাইটেল-হীন ব্যানারও ক্র্যাশ ছাড়া রেন্ডার হয়", () => {
    render(
      <NextIntlClientProvider locale="bn" messages={bn}>
        <HeroSlider
          images={[]}
          banners={[
            { id: "b2", title: null, subtitle: null, imageUrl: "/b2.jpg", linkUrl: null },
          ]}
        />
      </NextIntlClientProvider>
    );
    expect(screen.getByText(/এক ক্লিকেই ঘরে/)).toBeTruthy();
  });
});
