"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createBanner, updateBanner, type AdminState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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

export function BannerForm({
  bannerId,
  defaults,
}: {
  bannerId?: string;
  defaults?: BannerFormDefaults;
}) {
  const action = bannerId ? updateBanner.bind(null, bannerId) : createBanner;
  const [state, formAction, pending] = useActionState<AdminState, FormData>(action, {});
  const isEdit = !!bannerId;

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

      <div>
        <Label htmlFor="imageUrl">ছবির লিংক</Label>
        <Input
          id="imageUrl"
          name="imageUrl"
          placeholder="https://example.com/banner.jpg"
          defaultValue={defaults?.imageUrl ?? ""}
        />
        {state.errors?.imageUrl && (
          <p className="mt-1 text-xs text-destructive">{state.errors.imageUrl[0]}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="linkUrl">লিংক (ঐচ্ছিক)</Label>
          <Input
            id="linkUrl"
            name="linkUrl"
            placeholder="/categories/fashion"
            defaultValue={defaults?.linkUrl ?? ""}
          />
          {state.errors?.linkUrl && (
            <p className="mt-1 text-xs text-destructive">{state.errors.linkUrl[0]}</p>
          )}
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
            <Link href="/admin/banners">বাতিল</Link>
          </Button>
        )}
      </div>

      {state.message && !state.errors && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {state.message}
          {!isEdit && (
            <>
              {" "}
              <Link href="/admin/banners" className="font-medium underline">
                ব্যানার লিস্টে যান
              </Link>
            </>
          )}
        </p>
      )}
    </form>
  );
}
