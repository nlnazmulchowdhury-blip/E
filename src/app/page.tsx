import { Suspense } from "react";
import Link from "next/link";
import { Zap, Megaphone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  getCategories,
  getFlashSaleProducts,
  getNewArrivals,
  getBestRatedProducts,
  getActiveBanners,
  getHeroCollageImages,
} from "@/lib/data";
import { getSiteSettings, SITE_SETTING_KEYS } from "@/lib/site-settings";
import { ProductCard } from "@/components/product/product-card";
import { HeroSlider } from "@/components/home/hero-slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const categoryIcons: Record<string, string> = {
  electronics: "📱",
  fashion: "👗",
  "home-living": "🛋️",
  "beauty-care": "💄",
  groceries: "🛒",
  "sports-outdoors": "🏏",
};

function HeroSkeleton() {
  return (
    <section className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
        <div className="h-64 w-full animate-pulse rounded-2xl bg-muted md:h-[21rem] lg:h-[24rem]" />
      </div>
    </section>
  );
}

function CardGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid animate-pulse grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl border p-3">
          <div className="aspect-square rounded-lg bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 h-7 w-44 animate-pulse rounded bg-muted" />
      <CardGridSkeleton />
    </div>
  );
}

// ইউজার প্রথমে যা দেখে — ঘোষণা বার + হিরো। শুধু হালকা কুয়েরিগুলো এখানে,
// তাই নামের নিচের প্রোডাক্ট সেকশনের জন্য অপেক্ষা না করেই এটা আঁকা হয়ে যায়।
async function HomeHero() {
  const [banners, settings, heroImages] = await Promise.all([
    getActiveBanners(),
    getSiteSettings([SITE_SETTING_KEYS.announcement]),
    getHeroCollageImages(),
  ]);

  const announcement =
    (settings[SITE_SETTING_KEYS.announcement] as string | null) ?? null;
  const heroBanners = banners
    .filter((b) => b.position === "HERO")
    .map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl,
    }));

  return (
    <>
      {announcement && (
        <div className="border-b bg-navy text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs md:text-sm">
            <Megaphone className="size-4 shrink-0 text-brand" />
            <span>{announcement}</span>
          </div>
        </div>
      )}

      <HeroSlider images={heroImages} banners={heroBanners} />
    </>
  );
}

// স্ক্রল করে নিচে গেলে যেসব সেকশন আসে — এগুলো আলাদা স্ট্রিমে পাঠাই।
async function HomeCatalog() {
  const t = await getTranslations("Home");
  const [categories, flashSale, newArrivals, bestRated, banners, settings] =
    await Promise.all([
      getCategories(),
      getFlashSaleProducts(),
      getNewArrivals(),
      getBestRatedProducts(),
      getActiveBanners(),
      // চারটি আলাদা সেটিং কুয়েরির বদলে একটাই কুয়েরি
      getSiteSettings([
        SITE_SETTING_KEYS.showFlashSale,
        SITE_SETTING_KEYS.showNewArrivals,
        SITE_SETTING_KEYS.showBestRated,
      ]),
    ]);

  const showFlashSale = settings[SITE_SETTING_KEYS.showFlashSale];
  const showNewArrivals = settings[SITE_SETTING_KEYS.showNewArrivals];
  const showBestRated = settings[SITE_SETTING_KEYS.showBestRated];

  const stripBanners = banners.filter((b) => b.position === "STRIP");
  const promoBanners = banners.filter((b) => b.position === "PROMO");

  return (
    <>
      {/* Strip banners */}
      {stripBanners.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-4">
          <div className="space-y-3">
            {stripBanners.map((b) => {
              const img = (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.imageUrl}
                  alt={b.title ?? ""}
                  className="h-24 w-full rounded-xl border object-cover md:h-32"
                />
              );
              return b.linkUrl ? (
                <Link key={b.id} href={b.linkUrl} className="block">
                  {img}
                </Link>
              ) : (
                <div key={b.id}>{img}</div>
              );
            })}
          </div>
        </section>
      )}

      {/* Promo banners */}
      {promoBanners.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className={promoBanners.length > 1 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
            {promoBanners.map((b) => {
              const img = (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.imageUrl}
                  alt={b.title ?? ""}
                  className="h-40 w-full rounded-xl border object-cover md:h-48"
                />
              );
              return b.linkUrl ? (
                <Link key={b.id} href={b.linkUrl} className="block overflow-hidden rounded-xl">
                  {img}
                </Link>
              ) : (
                <div key={b.id}>{img}</div>
              );
            })}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold md:text-2xl">{t("categories")}</h2>
          <Button asChild variant="link">
            <Link href="/categories">{t("seeAll")}</Link>
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/categories/${c.slug}`}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors hover:border-primary hover:bg-primary/5"
            >
              <span className="text-3xl">{categoryIcons[c.slug] ?? "🛍️"}</span>
              <span className="text-xs font-medium md:text-sm">{c.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {t("productsCount", { count: c._count.products })}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Flash sale */}
      {showFlashSale !== false && flashSale.length > 0 && (
        <section>
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-amber-500 text-white">
                <Zap className="size-5" />
              </span>
              <h2 className="text-xl font-bold md:text-2xl">{t("flashSale")}</h2>
              <Badge className="bg-red-500 text-white hover:bg-red-500">{t("limitedTime")}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {flashSale.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New arrivals */}
      {showNewArrivals !== false && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold md:text-2xl">{t("newArrivals")}</h2>
            <Button asChild variant="link">
              <Link href="/search?sort=newest">{t("seeAll")}</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Best rated */}
      {showBestRated !== false && bestRated.length > 0 && (
        <section>
          <div className="mx-auto max-w-7xl px-4 py-10">
            <h2 className="mb-6 text-xl font-bold md:text-2xl">{t("bestRated")}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {bestRated.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <div>
      <Suspense fallback={<HeroSkeleton />}>
        <HomeHero />
      </Suspense>
      <Suspense fallback={<CatalogSkeleton />}>
        <HomeCatalog />
      </Suspense>
    </div>
  );
}
