import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyForSeller, updateShopSettings } from "./seller";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    sellerProfile: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    shop: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    user: { update: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => {
      for (const op of ops) await op;
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

function validForm() {
  const fd = new FormData();
  fd.set("shopName", "ঢাকা ফ্যাশন হাউজ");
  fd.set("description", "প্রিমিয়াম পোশাকের অনলাইন শপ, সারা দেশে ডেলিভারি দিই।");
  fd.set("phone", "01712345678");
  fd.set("bkashNumber", "01712345678");
  fd.set("bankName", "ডাচ্-বাংলা ব্যাংক");
  fd.set("bankAccountName", "Nazmul Chowdhury");
  fd.set("bankAccountNo", "1234567890");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "CUSTOMER" } });
  mocks.prisma.sellerProfile.findUnique.mockResolvedValue(null);
  mocks.prisma.shop.findUnique.mockResolvedValue(null);
  mocks.prisma.sellerProfile.create.mockResolvedValue({ id: "sp-1" });
  mocks.prisma.sellerProfile.update.mockResolvedValue({ id: "sp-1" });
  mocks.prisma.shop.update.mockResolvedValue({ id: "shop-1" });
});

describe("applyForSeller", () => {
  it("লগইন না থাকলে callbackUrl সহ লগইন পেজে রিডাইরেক্ট", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(applyForSeller({}, validForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/login?callbackUrl=/become-seller");
  });

  it("সঠিক ডেটায় PENDING প্রোফাইল + শপ তৈরি করে", async () => {
    const result = await applyForSeller({}, validForm());

    expect(result).toEqual({
      message: "আবেদন জমা হয়েছে — অ্যাডমিন অনুমোদন দিলেই সেলার প্যানেল পাবেন",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/become-seller");
    expect(mocks.prisma.sellerProfile.create).toHaveBeenCalledTimes(1);
    const data = mocks.prisma.sellerProfile.create.mock.calls[0][0].data;
    expect(data.userId).toBe("u-1");
    expect(data.bankName).toBe("ডাচ্-বাংলা ব্যাংক");
    expect(data.bankAccountName).toBe("Nazmul Chowdhury");
    expect(data.bankAccountNo).toBe("1234567890");
    expect(data.bkashNumber).toBe("01712345678");
    expect(data.shop.create).toEqual({
      name: "ঢাকা ফ্যাশন হাউজ",
      slug: "ঢাকা-ফ্যাশন-হাউজ",
      description: "প্রিমিয়াম পোশাকের অনলাইন শপ, সারা দেশে ডেলিভারি দিই।",
      address: null,
    });
  });

  it("ঠিকানা দিলে শপে address সেভ হয়", async () => {
    const fd = validForm();
    fd.set("address", "১২/এ, মিরপুর রোড, ঢাকা-১২১৬");
    await applyForSeller({}, fd);

    const data = mocks.prisma.sellerProfile.create.mock.calls[0][0].data;
    expect(data.shop.create.address).toBe("১২/এ, মিরপুর রোড, ঢাকা-১২১৬");
  });

  it("ঠিকানা ৩০০ অক্ষরের বেশি হলে এরর দেখায়", async () => {
    const fd = validForm();
    fd.set("address", "ঠ".repeat(301));
    const result = await applyForSeller({}, fd);

    expect(result.errors?.address).toBeTruthy();
    expect(mocks.prisma.sellerProfile.create).not.toHaveBeenCalled();
  });

  it("ফোন দিলে ইউজারের phone আপডেট হয়", async () => {
    await applyForSeller({}, validForm());
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { phone: "01712345678" },
    });
  });

  it("শপের স্লাগ আগে থেকে থাকলে এরর দেখায়, কিছু তৈরি করে না", async () => {
    mocks.prisma.shop.findUnique.mockResolvedValue({ id: "other", sellerProfileId: "x" });
    const result = await applyForSeller({}, validForm());

    expect(result.errors?.shopName).toBeTruthy();
    expect(mocks.prisma.sellerProfile.create).not.toHaveBeenCalled();
  });

  it("ভুল ডেটায় এরর রিটার্ন করে, কিছু তৈরি করে না", async () => {
    const fd = new FormData();
    fd.set("shopName", "ক");
    fd.set("description", "ছোট");
    const result = await applyForSeller({}, fd);

    expect(result.errors?.shopName).toBeTruthy();
    expect(result.errors?.description).toBeTruthy();
    expect(mocks.prisma.sellerProfile.create).not.toHaveBeenCalled();
  });

  it("ভুল বিকাশ নম্বরে এরর দেখায়", async () => {
    const fd = validForm();
    fd.set("bkashNumber", "123");
    const result = await applyForSeller({}, fd);

    expect(result.errors?.bkashNumber).toBeTruthy();
    expect(mocks.prisma.sellerProfile.create).not.toHaveBeenCalled();
  });

  it("ইতিমধ্যে PENDING থাকলে মেসেজ দেয়, নতুন কিছু তৈরি করে না", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({
      id: "sp-1",
      status: "PENDING",
      shop: { name: "পুরনো শপ" },
    });
    const result = await applyForSeller({}, validForm());

    expect(result.message).toContain("ইতিমধ্যে জমা আছে");
    expect(mocks.prisma.sellerProfile.create).not.toHaveBeenCalled();
  });

  it("ইতিমধ্যে APPROVED হলে সেলার প্যানেলে রিডাইরেক্ট", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({
      id: "sp-1",
      status: "APPROVED",
      shop: { name: "শপ" },
    });
    await expect(applyForSeller({}, validForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/seller");
  });

  it("SUSPENDED সেলার আবার আবেদন করতে পারে না", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({
      id: "sp-1",
      status: "SUSPENDED",
      shop: { name: "শপ" },
    });
    const result = await applyForSeller({}, validForm());

    expect(result.errors?.shopName).toBeTruthy();
    expect(mocks.prisma.sellerProfile.create).not.toHaveBeenCalled();
  });

  it("REJECTED আবেদন আবার করলে প্রোফাইল ও শপ আপডেট হয়", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({
      id: "sp-1",
      status: "REJECTED",
      shop: { id: "shop-1", name: "পুরনো শপ" },
    });
    const result = await applyForSeller({}, validForm());

    expect(result.message).toContain("জমা হয়েছে");
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.sellerProfile.update).toHaveBeenCalledWith({
      where: { userId: "u-1" },
      data: {
        status: "PENDING",
        verifiedAt: null,
        rejectionReason: null,
        bankName: "ডাচ্-বাংলা ব্যাংক",
        bankAccountName: "Nazmul Chowdhury",
        bankAccountNo: "1234567890",
        bkashNumber: "01712345678",
      },
    });
    expect(mocks.prisma.shop.update).toHaveBeenCalledWith({
      where: { sellerProfileId: "sp-1" },
      data: {
        name: "ঢাকা ফ্যাশন হাউজ",
        slug: "ঢাকা-ফ্যাশন-হাউজ",
        description: "প্রিমিয়াম পোশাকের অনলাইন শপ, সারা দেশে ডেলিভারি দিই।",
        address: null,
      },
    });
    expect(mocks.prisma.sellerProfile.create).not.toHaveBeenCalled();
  });
});

describe("updateShopSettings", () => {
  const approvedProfile = {
    id: "sp-1",
    status: "APPROVED",
    shop: { id: "shop-1", name: "ঢাকা ফ্যাশন হাউজ" },
  };

  beforeEach(() => {
    mocks.auth.mockResolvedValue({ user: { id: "u-1", role: "SELLER" } });
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue(approvedProfile);
  });

  function settingsForm() {
    const fd = new FormData();
    fd.set("shopName", "ঢাকা ফ্যাশন হাউজ নতুন");
    fd.set("description", "প্রিমিয়াম পোশাকের অনলাইন শপ, সারা দেশে ডেলিভারি দিই।");
    fd.set("logoUrl", "https://example.com/logo.png");
    fd.set("bannerUrl", "");
    fd.set("bkashNumber", "01712345678");
    fd.set("bankName", "ডাচ্-বাংলা ব্যাংক");
    fd.set("bankAccountName", "Nazmul Chowdhury");
    fd.set("bankAccountNo", "1234567890");
    return fd;
  }

  it("শপের নাম, স্লাগ, বিবরণ, লোগো ও পেমেন্ট তথ্য আপডেট করে", async () => {
    const result = await updateShopSettings({}, settingsForm());

    expect(result).toEqual({ message: "শপের তথ্য আপডেট হয়েছে" });
    expect(mocks.prisma.shop.update).toHaveBeenCalledWith({
      where: { id: "shop-1" },
      data: {
        name: "ঢাকা ফ্যাশন হাউজ নতুন",
        slug: "ঢাকা-ফ্যাশন-হাউজ-নতুন",
        description: "প্রিমিয়াম পোশাকের অনলাইন শপ, সারা দেশে ডেলিভারি দিই।",
        address: null,
        logoUrl: "https://example.com/logo.png",
        bannerUrl: null,
      },
    });
    expect(mocks.prisma.sellerProfile.update).toHaveBeenCalledWith({
      where: { id: "sp-1" },
      data: {
        bankName: "ডাচ্-বাংলা ব্যাংক",
        bankAccountName: "Nazmul Chowdhury",
        bankAccountNo: "1234567890",
        bkashNumber: "01712345678",
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/seller");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/seller/settings");
  });

  it("অন্য শপের স্লাগের সাথে মিললে এরর দেয়", async () => {
    mocks.prisma.shop.findUnique.mockResolvedValue({ id: "other", sellerProfileId: "x" });
    const result = await updateShopSettings({}, settingsForm());

    expect(result.errors?.shopName).toBeTruthy();
    expect(mocks.prisma.shop.update).not.toHaveBeenCalled();
  });

  it("ভুল ডেটায় এরর রিটার্ন করে", async () => {
    const fd = new FormData();
    fd.set("shopName", "ক");
    fd.set("description", "ছোট");
    const result = await updateShopSettings({}, fd);

    expect(result.errors?.shopName).toBeTruthy();
    expect(result.errors?.description).toBeTruthy();
    expect(mocks.prisma.shop.update).not.toHaveBeenCalled();
  });

  it("প্রোফাইল APPROVED না হলে access-denied-এ রিডাইরেক্ট", async () => {
    mocks.prisma.sellerProfile.findUnique.mockResolvedValue({
      ...approvedProfile,
      status: "SUSPENDED",
    });
    await expect(updateShopSettings({}, settingsForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/access-denied");
    expect(mocks.prisma.shop.update).not.toHaveBeenCalled();
  });

  it("লগইন না থাকলে লগইন পেজে রিডাইরেক্ট", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(updateShopSettings({}, settingsForm())).rejects.toMatchObject({
      digest: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
