import { prisma } from "@/lib/prisma";
import { CACHE_TTL, cached } from "@/lib/cache";

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

const KNOWN_KEYS: string[] = [...Object.values(SITE_SETTING_KEYS), COMMISSION_SETTING_KEY];
const SETTINGS_CACHE_KEY = "site-settings";

// সব সেটিং এক কুয়েরিতে এনে ক্যাশ করি — হোম পেজ, প্রোডাক্ট পেজ (অর্ডার ফোন),
// অ্যাডমিন সেটিংস পেজ সবখানেই আলাদা কুয়েরি লাগত, প্রতিটির জন্য নতুন কানেকশন।
async function settingsSnapshot(): Promise<Record<string, unknown>> {
  return cached(SETTINGS_CACHE_KEY, CACHE_TTL, async () => {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: KNOWN_KEYS } } });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  });
}

export async function getSiteSetting<T = unknown>(key: string): Promise<T | null> {
  if (!KNOWN_KEYS.includes(key)) {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return (row?.value as T) ?? null;
  }
  const all = await settingsSnapshot();
  return (all[key] as T) ?? null;
}

// একসাথে কয়েকটি সেটিং দরকার হলে এক কুয়েরিতেই সব এনে দেয়
export async function getSiteSettings(keys: readonly string[]): Promise<Record<string, unknown>> {
  if (keys.some((key) => !KNOWN_KEYS.includes(key))) {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: [...keys] } } });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }
  const all = await settingsSnapshot();
  return Object.fromEntries(keys.map((key) => [key, all[key]]));
}

export async function getDefaultCommissionRate(): Promise<number> {
  const value = await getSiteSetting<number>(COMMISSION_SETTING_KEY);
  return typeof value === "number" ? value : DEFAULT_COMMISSION_RATE;
}
