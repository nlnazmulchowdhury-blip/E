import Link from "next/link";
import { headers } from "next/headers";
import { MessageCircle } from "lucide-react";
import { getSiteSetting, SITE_SETTING_KEYS } from "@/lib/site-settings";
import { whatsappLink } from "@/lib/phone";

// রেটিং/ডেলিভারি ট্র্যাকিং এখনো হয়নি — রেফারেন্সের মতো "যথেষ্ট ডেটা নেই" দেখাই, ফেক ডেটা নয়
const METRICS = [
  { label: "ইতিবাচক সেলার রেটিং", value: "যথেষ্ট ডেটা নেই" },
  { label: "সময়মতো ডেলিভারি", value: "যথেষ্ট ডেটা নেই" },
  { label: "চ্যাট রেসপন্স রেট", value: "যথেষ্ট ডেটা নেই" },
] as const;

export async function SellerCard({
  shop,
  title,
  slug,
}: {
  shop: { name: string; slug: string } | null;
  title: string;
  slug: string;
}) {
  if (!shop) return null;

  const phone = await getSiteSetting<string>(SITE_SETTING_KEYS.orderPhone);
  if (!phone) return null;

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const url = host ? `https://${host}/products/${slug}` : null;
  const message = url
    ? `আসসালামু আলাইকুম, আমি "${title}" প্রোডাক্টটি নিয়ে কথা বলতে চাই:\n${url}`
    : `আসসালামু আলাইকুম, আমি "${title}" প্রোডাক্টটি নিয়ে কথা বলতে চাই`;
  const wa = whatsappLink(phone, message);
  if (!wa) return null;

  return (
    <section aria-label="বিক্রেতা তথ্য" className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">বিক্রেতা</p>
          <p className="truncate font-bold">{shop.name}</p>
        </div>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <MessageCircle className="size-4" />
          চ্যাট করুন
        </a>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-border border-t pt-4">
        {METRICS.map((m) => (
          <div key={m.label} className="px-3 text-center first:pl-0 last:pr-0">
            <p className="text-[11px] leading-4 text-muted-foreground">{m.label}</p>
            <p className="mt-1 text-xs italic text-muted-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t pt-3 text-center">
        <Link
          href={`/shops/${shop.slug}`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          শপ ভিজিট করুন
        </Link>
      </div>
    </section>
  );
}
