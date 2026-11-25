"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { useTranslations } from "next-intl";
import { ShoppingBag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SlideImage = { url: string; title: string };

export type BannerSlide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
};

const SLIDE_INTERVAL = 5000;

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block -rotate-1 rounded-xl bg-brand px-3 pb-1 pt-0.5 text-[#111827]">
      {children}
    </span>
  );
}

function Collage({ images }: { images: SlideImage[] }) {
  const main = images[0];
  const rest = images.slice(1, 3);
  return (
    <div className="relative hidden h-56 w-80 shrink-0 md:block lg:h-72 lg:w-[26rem]">
      <div
        aria-hidden
        className="absolute right-2 top-1/2 size-56 -translate-y-1/2 rounded-full bg-brand/25 blur-2xl lg:size-64"
      />
      <div
        aria-hidden
        className="absolute bottom-1 left-1/2 h-6 w-56 -translate-x-1/2 rounded-[50%] bg-black/15 blur-[2px]"
      />
      <div
        aria-hidden
        className="absolute -left-1 top-4 size-16 rounded-full border-4 border-brand/40"
      />
      <div
        aria-hidden
        className="absolute bottom-7 right-10 flex size-10 rotate-12 items-center justify-center rounded-lg bg-brand shadow-md"
      >
        <Zap className="size-5 text-[#111827]" />
      </div>
      {main && (
        <img
          src={main.url}
          alt={main.title}
          className="absolute left-[38%] top-1/2 z-10 size-40 -translate-y-1/2 -rotate-3 rounded-2xl border-4 border-white object-cover shadow-xl lg:size-52"
        />
      )}
      {rest.map(
        (img, i) =>
          img && (
            <img
              key={img.url}
              src={img.url}
              alt={img.title}
              className={cn(
                "absolute z-10 rounded-xl border-4 border-white object-cover shadow-lg",
                i === 0
                  ? "left-4 top-2 size-20 -rotate-6 lg:size-24"
                  : "bottom-3 right-3 size-20 rotate-6 lg:size-24"
              )}
            />
          )
      )}
    </div>
  );
}

export function HeroSlider({
  images,
  banners,
}: {
  images: SlideImage[];
  banners: BannerSlide[];
}) {
  const t = useTranslations("HeroSlider");
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    timerRef.current = setInterval(() => emblaApi?.scrollNext(), SLIDE_INTERVAL);
  }, [emblaApi, stop]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    emblaApi.on("pointerDown", stop);
    emblaApi.on("pointerUp", start);
    start();
    return () => {
      stop();
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, start, stop]);

  type Slide = {
    headline: React.ReactNode;
    sub: string;
    cta: React.ReactNode | null;
    secondary: React.ReactNode | null;
    image?: { url: string; alt: string };
    // ব্যানারে লিংক থাকলে পুরো স্লাইডেই ক্লিক করা যায়
    href?: string;
  };

  const slides: Slide[] = [
    {
      headline: t.rich("slide1Headline", {
        br: () => <br className="hidden md:block" />,
        hl: (chunks) => <Highlight>{chunks}</Highlight>,
      }),
      sub: t("slide1Sub"),
      cta: (
        <Button asChild size="lg" className="bg-[#111827] text-white hover:bg-[#111827]/90">
          <Link href="/categories">
            <ShoppingBag className="size-4" />
            {t("startShopping")}
          </Link>
        </Button>
      ),
      secondary: (
        <Button asChild size="lg" variant="outline" className="bg-white hover:bg-white/80">
          <Link href="/search?q=">{t("allProducts")}</Link>
        </Button>
      ),
    },
    {
      headline: t.rich("slide2Headline", {
        br: () => <br className="hidden md:block" />,
        hl: (chunks) => <Highlight>{chunks}</Highlight>,
      }),
      sub: t("slide2Sub"),
      cta: (
        <Button asChild size="lg" className="bg-[#111827] text-white hover:bg-[#111827]/90">
          <Link href="/categories">{t("shopNow")}</Link>
        </Button>
      ),
      secondary: null,
    },
    {
      headline: t.rich("slide3Headline", {
        br: () => <br className="hidden md:block" />,
        hl: (chunks) => <Highlight>{chunks}</Highlight>,
      }),
      sub: t("slide3Sub"),
      cta: (
        <Button asChild size="lg" className="bg-[#111827] text-white hover:bg-[#111827]/90">
          <Link href="/checkout">{t("orderNow")}</Link>
        </Button>
      ),
      secondary: null,
    },
    ...banners.map((b) => ({
      headline: b.title ?? "",
      sub: b.subtitle ?? "",
      cta: b.linkUrl ? (
        // পুরো স্লাইড Link হলে ভিতরে আরেকটি <a> রাখা যায় না
        <span className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-medium text-[#111827]">
          {t("shopNow")}
        </span>
      ) : null,
      secondary: null,
      image: { url: b.imageUrl, alt: b.title ?? "" },
      href: b.linkUrl ?? undefined,
    })),
  ];

  return (
    <section className="border-b bg-white" onMouseEnter={stop} onMouseLeave={start}>
      <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {slides.map((slide, i) => {
              const Heading = i === 0 ? "h1" : "h2";
              if (slide.image) {
                const banner = (
                    <div className="relative overflow-hidden rounded-2xl bg-[#f5f6f8]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide.image.url}
                        alt={slide.image.alt}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
                      <div className="relative z-10 grid min-h-[16rem] items-center px-6 py-8 md:min-h-[21rem] md:px-10 md:py-10 lg:min-h-[24rem]">
                        <div className="max-w-xl space-y-4 md:space-y-5">
                          {slide.headline ? (
                            <Heading className="text-2xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
                              {slide.headline}
                            </Heading>
                          ) : null}
                          {slide.sub ? (
                            <p className="text-sm text-white/90 md:text-base lg:text-lg">
                              {slide.sub}
                            </p>
                          ) : null}
                          {slide.cta ? (
                            <div className="flex flex-wrap items-center gap-3 pt-1">{slide.cta}</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                );
                return (
                  <div key={i} className="min-w-0 flex-[0_0_100%]">
                    {slide.href ? (
                      <Link href={slide.href} className="block">
                        {banner}
                      </Link>
                    ) : (
                      banner
                    )}
                  </div>
                );
              }
              return (
              <div key={i} className="min-w-0 flex-[0_0_100%]">
                <div className="relative overflow-hidden rounded-2xl bg-[#f5f6f8]">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-brand/15"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-navy/5"
                  />
                  <div className="relative grid min-h-[16rem] items-center gap-6 px-6 py-8 md:min-h-[21rem] md:grid-cols-2 md:gap-2 md:px-10 md:py-10 lg:min-h-[24rem]">
                    <div className="space-y-4 md:space-y-5">
                      <Heading className="text-2xl font-bold leading-tight text-[#111827] md:text-4xl lg:text-5xl">
                        {slide.headline}
                      </Heading>
                      <p className="max-w-xl text-sm text-muted-foreground md:text-base lg:text-lg">
                        {slide.sub}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {slide.cta}
                        {slide.secondary}
                      </div>
                    </div>
                    <Collage
                      images={
                        images.length > 0
                          ? Array.from(
                              { length: 3 },
                              (_, k) =>
                                images[
                                  (i * Math.max(1, Math.floor(images.length / 3)) + k) %
                                    images.length
                                ]
                            )
                          : []
                      }
                    />
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={t("slideLabel", { n: i + 1 })}
              className={cn(
                "h-2 cursor-pointer rounded-full transition-all duration-300",
                i === selected ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/40"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
