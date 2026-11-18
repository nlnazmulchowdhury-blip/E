"use client";

import { useActionState } from "react";
import { saveSiteSettings, type AdminState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export type SiteSettingsDefaults = {
  siteName: string;
  siteTagline: string;
  supportPhone: string;
  supportEmail: string;
  orderPhone: string;
  announcement: string;
  showFlashSale: boolean;
  showNewArrivals: boolean;
  showBestRated: boolean;
};

export function SiteSettingsForm({ defaults }: { defaults: SiteSettingsDefaults }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    saveSiteSettings,
    {}
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="siteName">সাইটের নাম</Label>
          <Input id="siteName" name="siteName" defaultValue={defaults.siteName} />
          {state.errors?.siteName && (
            <p className="mt-1 text-xs text-destructive">{state.errors.siteName[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="siteTagline">ট্যাগলাইন</Label>
          <Input id="siteTagline" name="siteTagline" defaultValue={defaults.siteTagline} />
          {state.errors?.siteTagline && (
            <p className="mt-1 text-xs text-destructive">{state.errors.siteTagline[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="supportPhone">সাপোর্ট ফোন</Label>
          <Input id="supportPhone" name="supportPhone" defaultValue={defaults.supportPhone} />
          {state.errors?.supportPhone && (
            <p className="mt-1 text-xs text-destructive">{state.errors.supportPhone[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="supportEmail">সাপোর্ট ইমেইল</Label>
          <Input id="supportEmail" name="supportEmail" defaultValue={defaults.supportEmail} />
          {state.errors?.supportEmail && (
            <p className="mt-1 text-xs text-destructive">{state.errors.supportEmail[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="orderPhone">অর্ডার ফোন (WhatsApp ও কল বাটন)</Label>
          <Input id="orderPhone" name="orderPhone" defaultValue={defaults.orderPhone} placeholder="01700000000" />
          {state.errors?.orderPhone && (
            <p className="mt-1 text-xs text-destructive">{state.errors.orderPhone[0]}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="announcement">ঘোষণা বার (হোমপেজের উপরে, খালি রাখলে দেখাবে না)</Label>
        <Input
          id="announcement"
          name="announcement"
          defaultValue={defaults.announcement}
          placeholder="যেমন: ঈদ অফারে ২০% ছাড় — আজই অর্ডার করুন"
        />
        {state.errors?.announcement && (
          <p className="mt-1 text-xs text-destructive">{state.errors.announcement[0]}</p>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">হোমপেজ সেকশন</p>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox name="showFlashSale" className="size-4" defaultChecked={defaults.showFlashSale} />
            ফ্ল্যাশ সেল সেকশন দেখান
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox name="showNewArrivals" className="size-4" defaultChecked={defaults.showNewArrivals} />
            নতুন প্রোডাক্ট সেকশন দেখান
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox name="showBestRated" className="size-4" defaultChecked={defaults.showBestRated} />
            সেরা রেটেড সেকশন দেখান
          </label>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "সেভ হচ্ছে..." : "সেটিংস সেভ করুন"}
      </Button>

      {state.message && !state.errors && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{state.message}</p>
      )}
    </form>
  );
}
