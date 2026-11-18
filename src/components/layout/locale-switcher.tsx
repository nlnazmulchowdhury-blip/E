"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

const options = [
  { code: "bn", label: "বাং" },
  { code: "en", label: "EN" },
];

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  function switchTo(next: string) {
    if (next === locale) return;
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="flex items-center overflow-hidden rounded-lg border text-xs font-semibold">
      {options.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => switchTo(o.code)}
          aria-pressed={o.code === locale}
          className={cn(
            "cursor-pointer px-2.5 py-1.5 transition-colors",
            o.code === locale ? "bg-navy text-white" : "text-muted-foreground hover:bg-muted"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
