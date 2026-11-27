"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createBanner, updateBanner, type AdminState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUrlInput } from "@/components/shared/image-url-input";

const POSITION_LABELS: Record<string, string> = {
  HERO: "হিরো স্লাইডার",
  STRIP: "স্ট্রিপ (হিরোর নিচে)",
  PROMO: "প্রোমো কার্ড",
};

export type BannerFormDefaults = {
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  sortOrder: string;
  isActive: boolean;
};

export type BannerProductOption = { id: string; title: string; slug: string };

export function BannerForm({
  bannerId,
  defaults,
  products = [],
}: {
  bannerId?: string;
  defaults?: BannerFormDefaults;
  products?: BannerProductOption[];
}) {
  const action = bannerId ? updateBanner.bind(null, bannerId) : createBanner;
  const [state, formAction, pending] = useActionState<AdminState, FormData>(action, {});
  const isEdit = !!bannerId;

  // লিংকের বদলে লিস্ট থেকে প্রোডাক্ট বেছে নিলে সরাসরি তার পেজে যাবে
  const [linkUrl, setLinkUrl] = useState(defaults?.linkUrl ?? "");
  const selectedProductId =
    products.find((p) => `/products/${p.slug}` === linkUrl)?.id ?? "";

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="title">টাইটেল (ঐচ্ছিক)</Label>
          <Input
            id="title"
            name="title"
            placeholder="যেমন: ঈদ স্পেশাল অফার"
            defaultValue={defaults?.title ?? ""}
          />
          {state.errors?.title && (
            <p className="mt-1 text-xs text-destructive">{state.errors.title[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="subtitle">সাবটাইটেল (ঐচ্ছিক)</Label>
          <Input
            id="subtitle"
            name="subtitle"
            placeholder="ছোট বিবরণ"
            defaultValue={defaults?.subtitle ?? ""}
          />
          {state.errors?.subtitle && (
            <p className="mt-1 text-xs text-destructive">{state.errors.subtitle[0]}</p>
          )}
        </div>
      </div>

      <ImageUrlInput
        id="imageUrl"
        name="imageUrl"
        single
        defaultValue={defaults?.imageUrl ?? ""}
        error={state.errors?.imageUrl?.[0]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="linkUrl">লিংক (ঐচ্ছিক)</Label>
          <Input
            id="linkUrl"
            name="linkUrl"
            placeholder="/products/product-slug"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
          {state.errors?.linkUrl && (
            <p className="mt-1 text-xs text-destructive">{state.errors.linkUrl[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="productPick">প্রোডাক্ট লিংক (ঐচ্ছিক)</Label>
          <select
            id="productPick"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={selectedProductId}
            onChange={(e) => {
              const picked = products.find((p) => p.id === e.target.value);
              setLinkUrl(picked ? `/products/${picked.slug}` : "");
            }}
          >
            <option value="">— প্রোডাক্ট সিলেক্ট করুন —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="position">পজিশন</Label>
          <select
            id="position"
            name="position"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue={defaults?.position ?? "HERO"}
          >
            {Object.entries(POSITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {state.errors?.position && (
            <p className="mt-1 text-xs text-destructive">{state.errors.position[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="sortOrder">ক্রম (ছোট আগে)</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min="0"
            step="1"
            defaultValue={defaults?.sortOrder ?? "0"}
          />
          {state.errors?.sortOrder && (
            <p className="mt-1 text-xs text-destructive">{state.errors.sortOrder[0]}</p>
          )}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <Checkbox name="isActive" className="size-4" defaultChecked={defaults?.isActive ?? true} />
        সক্রিয় (সাইটে দেখাবে)
      </label>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? (isEdit ? "আপডেট হচ্ছে..." : "তৈরি হচ্ছে...") : isEdit ? "ব্যানার আপডেট করুন" : "ব্যানার তৈরি করুন"}
        </Button>
        {isEdit && (
          <Button asChild variant="ghost">
            <Link href="/admin/banners/all">বাতিল</Link>
          </Button>
        )}
      </div>

      {state.message && !state.errors && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {state.message}
          {!isEdit && (
            <>
              {" "}
              <Link href="/admin/banners/all" className="font-medium underline">
                ব্যানার লিস্টে যান
              </Link>
            </>
          )}
        </p>
      )}
    </form>
  );
}
