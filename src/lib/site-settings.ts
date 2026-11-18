import { prisma } from "@/lib/prisma";

export const COMMISSION_SETTING_KEY = "commission.defaultRate";
export const DEFAULT_COMMISSION_RATE = 5;

// অ্যাডমিন সেটিংস পেজ থেকে এডিটযোগ্য সাইট সেটিংস কী
export const SITE_SETTING_KEYS = {
  siteName: "site.name",
  siteTagline: "site.tagline",
  supportPhone: "site.supportPhone",
  supportEmail: "site.supportEmail",
  orderPhone: "site.orderPhone",
  announcement: "site.announcement",
  showFlashSale: "homepage.showFlashSale",
  showNewArrivals: "homepage.showNewArrivals",
  showBestRated: "homepage.showBestRated",
} as const;

export async function getSiteSetting<T = unknown>(key: string): Promise<T | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  return (row?.value as T) ?? null;
}

export async function getDefaultCommissionRate(): Promise<number> {
  const value = await getSiteSetting<number>(COMMISSION_SETTING_KEY);
  return typeof value === "number" ? value : DEFAULT_COMMISSION_RATE;
}
