import { getSiteSetting, SITE_SETTING_KEYS } from "@/lib/site-settings";
import { requireAdminOrStaff } from "@/lib/permissions";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "ওয়েবসাইট সেটিংস" };

export default async function AdminSettingsPage() {
  await requireAdminOrStaff("settings");

  const [siteName, siteTagline, supportPhone, supportEmail, orderPhone, announcement, showFlashSale, showNewArrivals, showBestRated] =
    await Promise.all([
      getSiteSetting<string>(SITE_SETTING_KEYS.siteName),
      getSiteSetting<string>(SITE_SETTING_KEYS.siteTagline),
      getSiteSetting<string>(SITE_SETTING_KEYS.supportPhone),
      getSiteSetting<string>(SITE_SETTING_KEYS.supportEmail),
      getSiteSetting<string>(SITE_SETTING_KEYS.orderPhone),
      getSiteSetting<string>(SITE_SETTING_KEYS.announcement),
      getSiteSetting<boolean>(SITE_SETTING_KEYS.showFlashSale),
      getSiteSetting<boolean>(SITE_SETTING_KEYS.showNewArrivals),
      getSiteSetting<boolean>(SITE_SETTING_KEYS.showBestRated),
    ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">ওয়েবসাইট সেটিংস</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        সাইটের নাম, সাপোর্ট তথ্য, ঘোষণা ও হোমপেজ সেকশন নিয়ন্ত্রণ
      </p>
      <div className="rounded-xl border bg-card p-5">
        <SiteSettingsForm
          defaults={{
            siteName: siteName ?? "ShopDesh",
            siteTagline: siteTagline ?? "",
            supportPhone: supportPhone ?? "",
            supportEmail: supportEmail ?? "",
            orderPhone: orderPhone ?? "",
            announcement: announcement ?? "",
            showFlashSale: showFlashSale !== false,
            showNewArrivals: showNewArrivals !== false,
            showBestRated: showBestRated !== false,
          }}
        />
      </div>
    </div>
  );
}
