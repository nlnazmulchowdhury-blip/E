"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  title,
}: {
  images: { id: string; url: string; alt?: string | null }[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const count = images.length;
  const current = images[active] ?? images[0];

  const prev = () => setActive((a) => (a - 1 + count) % count);
  const next = () => setActive((a) => (a + 1) % count);

  return (
    <div className="flex gap-2 md:gap-3">
      {count > 1 && (
        <div className="flex shrink-0 flex-col gap-2 md:gap-3">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`ছবি ${i + 1}`}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors size-11 md:size-20",
                i === active ? "border-primary" : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt ?? title}
                className="size-full object-cover"
              />
              {i === active && (
                <span className="absolute inset-0 m-auto flex size-5 items-center justify-center rounded-full bg-white text-primary shadow-sm md:size-6">
                  <Check className="size-3.5 md:size-4" strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1 overflow-hidden rounded-2xl bg-white">
        <div className="relative mx-auto w-full max-w-[273px] rounded-2xl border bg-white md:max-w-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current?.url ?? "/placeholder.svg"}
            alt={current?.alt ?? title}
            className="aspect-[5/4] w-full object-cover [@media(min-height:680px)]:aspect-[271/286]"
          />
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="আগের ছবি"
                className="absolute left-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-blue-500 drop-shadow-sm transition-colors hover:text-blue-700 md:size-9"
              >
                <ChevronLeft className="size-6 md:size-7" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="পরের ছবি"
                className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-blue-500 drop-shadow-sm transition-colors hover:text-blue-700 md:size-9"
              >
                <ChevronRight className="size-6 md:size-7" strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
