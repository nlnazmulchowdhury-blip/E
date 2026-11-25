import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createBanner,
  updateBanner,
  toggleBanner,
  deleteBanner,
  saveSiteSettings,
} from "./admin";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    banner: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    siteSetting: { upsert: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(async (ops: unknown) => {
      if (Array.isArray(ops)) for (const op of ops) await op;
    }),
  },
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mocks.redirect(...args);
    const e = new Error("NEXT_REDIRECT") as Error & { digest: string };
    e.digest = "NEXT_REDIRECT";
    throw e;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

function validBannerForm() {
  const fd = new FormData();
  fd.set("title", "ঈদ স্পেশাল অফার");
  fd.set("subtitle", "সব পাঞ্জাবিতে ২০% ছাড়");
  fd.set("imageUrl", "https://example.com/eid.jpg");
  fd.set("linkUrl", "/categories/fashion");
  fd.set("position", "HERO");
  fd.set("sortOrder", "1");
  fd.set("isActive", "on");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
  mocks.prisma.banner.create.mockImplementation(async ({ data }: { data: { position: string; title: string | null } }) => ({
    id: "b-1",
    position: data.position,
    title: data.title,
  }));
  mocks.prisma.banner.findUnique.mockResolvedValue({
    id: "b-1",
    title: "ঈদ স্পেশাল অফার",
    isActive: true,
  });
  mocks.prisma.banner.update.mockResolvedValue({ id: "b-1" });
});

describe("createBanner", () => {
  it("সঠিক ডেটায় ব্যানার তৈরি + অডিট + রিভ্যালিডেট করে", async () => {
    const result = await createBanner({}, validBannerForm());

    expect(result).toEqual({ message: "ব্যানার তৈরি হয়েছে" });
    const data = mocks.prisma.banner.create.mock.calls[0][0].data;
    expect(data).toEqual({
      title: "ঈদ স্পেশাল অফার",
      subtitle: "সব পাঞ্জাবিতে ২০% ছাড়",
      imageUrl: "https://example.com/eid.jpg",
      linkUrl: "/categories/fashion",
      position: "HERO",
      sortOrder: 1,
      isActive: true,
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "CREATE",
        entity: "BANNER",
        entityId: "b-1",
        details: { position: "HERO", title: "ঈদ স্পেশাল অফার" },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/banners");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("isActive চেক না থাকলে নিষ্ক্রিয় ব্যানার তৈরি হয়", async () => {
    const fd = validBannerForm();
    fd.delete("isActive");
    await createBanner({}, fd);

    const data = mocks.prisma.banner.create.mock.calls[0][0].data;
    expect(data.isActive).toBe(false);
  });

  it("খালি টাইটেল/লিংকে null সেভ হয়", async () => {
    const fd = validBannerForm();
    fd.delete("title");
    fd.delete("linkUrl");
    await createBanner({}, fd);

    const data = mocks.prisma.banner.create.mock.calls[0][0].data;
    expect(data.title).toBeNull();
    expect(data.linkUrl).toBeNull();
  });

  it("আপলোড করা সাইট-অভ্যন্তরীণ ছবির লিংক (/api/images/...) গ্রহণ করে", async () => {
    const fd = validBannerForm();
    fd.set("imageUrl", "/api/images/cmwuymip30000uk1k84sg0fuu");
    const result = await createBanner({}, fd);

    expect(result).toEqual({ message: "ব্যানার তৈরি হয়েছে" });
    expect(mocks.prisma.banner.create.mock.calls[0][0].data.imageUrl).toBe(
      "/api/images/cmwuymip30000uk1k84sg0fuu"
    );
  });

  it("ভুল ছবির লিংকে এরর, তৈরি করে না", async () => {
    const fd = validBannerForm();
    fd.set("imageUrl", "ftp://bad.example/a.jpg");
    const result = await createBanner({}, fd);

    expect(result.errors?.imageUrl).toBeTruthy();
    expect(mocks.prisma.banner.create).not.toHaveBeenCalled();
  });

  it("অবৈধ পজিশনে এরর", async () => {
    const fd = validBannerForm();
    fd.set("position", "SIDEBAR");
    const result = await createBanner({}, fd);

    expect(result.errors?.position).toBeTruthy();
    expect(mocks.prisma.banner.create).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন ইউজার রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "CUSTOMER" } });
    await expect(createBanner({}, validBannerForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
    expect(mocks.prisma.banner.create).not.toHaveBeenCalled();
  });
});

describe("updateBanner", () => {
  it("সঠিক ডেটায় ব্যানার আপডেট + অডিট করে", async () => {
    const result = await updateBanner("b-1", {}, validBannerForm());

    expect(result).toEqual({ message: "ব্যানার আপডেট হয়েছে" });
    expect(mocks.prisma.banner.update).toHaveBeenCalledWith({
      where: { id: "b-1" },
      data: expect.objectContaining({ position: "HERO", sortOrder: 1, isActive: true }),
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "UPDATE",
        entity: "BANNER",
        entityId: "b-1",
        details: { position: "HERO", title: "ঈদ স্পেশাল অফার" },
      },
    });
  });

  it("যে ব্যানার নেই তাতে এরর দেয়", async () => {
    mocks.prisma.banner.findUnique.mockResolvedValue(null);
    const result = await updateBanner("gone", {}, validBannerForm());

    expect(result.errors?.imageUrl).toEqual(["ব্যানার খুঁজে পাওয়া যায়নি"]);
    expect(mocks.prisma.banner.update).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন ইউজার রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "SELLER" } });
    await expect(updateBanner("b-1", {}, validBannerForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.prisma.banner.update).not.toHaveBeenCalled();
  });
});

describe("toggleBanner", () => {
  it("সক্রিয় ব্যানার নিষ্ক্রিয় করে", async () => {
    await toggleBanner("b-1");
    expect(mocks.prisma.banner.update).toHaveBeenCalledWith({
      where: { id: "b-1" },
      data: { isActive: false },
    });
  });

  it("নিষ্ক্রিয় ব্যানার সক্রিয় করে", async () => {
    mocks.prisma.banner.findUnique.mockResolvedValue({ id: "b-1", isActive: false });
    await toggleBanner("b-1");
    expect(mocks.prisma.banner.update).toHaveBeenCalledWith({
      where: { id: "b-1" },
      data: { isActive: true },
    });
  });

  it("যে ব্যানার নেই তাতে এরর থ্রো করে", async () => {
    mocks.prisma.banner.findUnique.mockResolvedValue(null);
    await expect(toggleBanner("gone")).rejects.toThrow("ব্যানার খুঁজে পাওয়া যায়নি");
  });
});

describe("deleteBanner", () => {
  it("ব্যানার হার্ড ডিলিট + অডিট + রিভ্যালিডেট করে", async () => {
    await deleteBanner("b-1");

    expect(mocks.prisma.banner.delete).toHaveBeenCalledWith({ where: { id: "b-1" } });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "DELETE",
        entity: "BANNER",
        entityId: "b-1",
        details: { title: "ঈদ স্পেশাল অফার" },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/banners");
  });

  it("যে ব্যানার নেই তাতে এরর থ্রো করে", async () => {
    mocks.prisma.banner.findUnique.mockResolvedValue(null);
    await expect(deleteBanner("gone")).rejects.toThrow("ব্যানার খুঁজে পাওয়া যায়নি");
    expect(mocks.prisma.banner.delete).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন ইউজার রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "CUSTOMER" } });
    await expect(deleteBanner("b-1")).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.prisma.banner.delete).not.toHaveBeenCalled();
  });
});

function validSettingsForm() {
  const fd = new FormData();
  fd.set("siteName", "ShopDesh BD");
  fd.set("siteTagline", "আপনার পছন্দের সবকিছু");
  fd.set("supportPhone", "01700000000");
  fd.set("supportEmail", "support@shopdesh.com");
  fd.set("orderPhone", "01926841630");
  fd.set("announcement", "ঈদ অফারে ২০% ছাড়");
  fd.set("showFlashSale", "on");
  fd.set("showNewArrivals", "on");
  fd.set("showBestRated", "on");
  return fd;
}

const ALL_KEYS = [
  "site.name",
  "site.tagline",
  "site.supportPhone",
  "site.supportEmail",
  "site.orderPhone",
  "site.announcement",
  "homepage.showFlashSale",
  "homepage.showNewArrivals",
  "homepage.showBestRated",
];

describe("saveSiteSettings", () => {
  it("৯টি কী-তে upsert করে + অডিট + রিভ্যালিডেট", async () => {
    const result = await saveSiteSettings({}, validSettingsForm());

    expect(result).toEqual({ message: "সেটিংস সেভ হয়েছে" });
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = mocks.prisma.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(9);
    expect(mocks.prisma.siteSetting.upsert).toHaveBeenCalledTimes(9);
    const upserted = mocks.prisma.siteSetting.upsert.mock.calls.map((c) => c[0]);
    expect(upserted.map((u) => u.where.key)).toEqual(ALL_KEYS);
    expect(upserted.find((u) => u.where.key === "site.name").create.value).toBe("ShopDesh BD");
    expect(upserted.find((u) => u.where.key === "homepage.showFlashSale").create.value).toBe(true);
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "UPDATE",
        entity: "SETTING",
        entityId: null,
        details: { keys: ALL_KEYS },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/settings");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("চেকবক্স বন্ধ থাকলে false সেভ হয়", async () => {
    const fd = validSettingsForm();
    fd.delete("showFlashSale");
    fd.delete("showNewArrivals");
    fd.delete("showBestRated");
    await saveSiteSettings({}, fd);

    const upserted = mocks.prisma.siteSetting.upsert.mock.calls.map((c) => c[0]);
    expect(upserted.find((u) => u.where.key === "homepage.showFlashSale").create.value).toBe(false);
    expect(upserted.find((u) => u.where.key === "homepage.showBestRated").create.value).toBe(false);
  });

  it("খালি ঐচ্ছিক ফিল্ডে null সেভ হয়", async () => {
    const fd = validSettingsForm();
    fd.delete("announcement");
    await saveSiteSettings({}, fd);

    const upserted = mocks.prisma.siteSetting.upsert.mock.calls.map((c) => c[0]);
    expect(upserted.find((u) => u.where.key === "site.announcement").create.value).toBe(
      Prisma.JsonNull
    );
  });

  it("ভুল সাইটের নামে এরর, কিছু সেভ করে না", async () => {
    const fd = validSettingsForm();
    fd.set("siteName", "ক");
    const result = await saveSiteSettings({}, fd);

    expect(result.errors?.siteName).toBeTruthy();
    expect(mocks.prisma.siteSetting.upsert).not.toHaveBeenCalled();
  });

  it("নন-অ্যাডমিন ইউজার রিডাইরেক্ট হয়", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "CUSTOMER" } });
    await expect(saveSiteSettings({}, validSettingsForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.prisma.siteSetting.upsert).not.toHaveBeenCalled();
  });
});
