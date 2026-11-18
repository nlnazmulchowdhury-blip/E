"use client";

import { useActionState } from "react";
import { updateShopSettings, type SellerState } from "@/lib/actions/seller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ShopSettingsForm({
  shop,
}: {
  shop: {
    name: string;
    description: string | null;
    address: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    bkashNumber: string | null;
    bankName: string | null;
    bankAccountName: string | null;
    bankAccountNo: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<SellerState, FormData>(
    updateShopSettings,
    {}
  );

  return (
    <form action={formAction} className="max-w-xl space-y-5 rounded-xl border bg-card p-6">
      <div>
        <Label htmlFor="shopName">শপের নাম *</Label>
        <Input id="shopName" name="shopName" defaultValue={shop.name} />
        {state.errors?.shopName && (
          <p className="mt-1 text-xs text-destructive">{state.errors.shopName[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">শপের বিবরণ *</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={shop.description ?? ""}
        />
        {state.errors?.description && (
          <p className="mt-1 text-xs text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="address">শপের ঠিকানা (ঐচ্ছিক)</Label>
        <Textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={shop.address ?? ""}
          placeholder="যেমন: ১২/এ, মিরপুর রোড, ঢাকা-১২১৬"
        />
        {state.errors?.address && (
          <p className="mt-1 text-xs text-destructive">{state.errors.address[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="logoUrl">লোগোর ছবির লিংক (ঐচ্ছিক)</Label>
        <Input id="logoUrl" name="logoUrl" defaultValue={shop.logoUrl ?? ""} placeholder="https://..." />
      </div>

      <div>
        <Label htmlFor="bannerUrl">ব্যানারের ছবির লিংক (ঐচ্ছিক)</Label>
        <Input id="bannerUrl" name="bannerUrl" defaultValue={shop.bannerUrl ?? ""} placeholder="https://..." />
      </div>

      <div className="rounded-lg border bg-muted/40 p-4">
        <p className="mb-1 text-sm font-semibold">পেমেন্ট তথ্য</p>
        <p className="mb-4 text-xs text-muted-foreground">
          বিক্রির টাকা তুলতে এই তথ্য লাগে
        </p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="bkashNumber">বিকাশ নম্বর</Label>
            <Input id="bkashNumber" name="bkashNumber" defaultValue={shop.bkashNumber ?? ""} placeholder="01XXXXXXXXX" />
            {state.errors?.bkashNumber && (
              <p className="mt-1 text-xs text-destructive">{state.errors.bkashNumber[0]}</p>
            )}
          </div>
          <div>
            <Label htmlFor="bankName">ব্যাংকের নাম</Label>
            <Input id="bankName" name="bankName" defaultValue={shop.bankName ?? ""} />
          </div>
          <div>
            <Label htmlFor="bankAccountName">অ্যাকাউন্টধারীর নাম</Label>
            <Input id="bankAccountName" name="bankAccountName" defaultValue={shop.bankAccountName ?? ""} />
          </div>
          <div>
            <Label htmlFor="bankAccountNo">অ্যাকাউন্ট নম্বর</Label>
            <Input id="bankAccountNo" name="bankAccountNo" defaultValue={shop.bankAccountNo ?? ""} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "সেভ হচ্ছে..." : "সেভ করুন"}
      </Button>

      {state.message && !state.errors && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{state.message}</p>
      )}
    </form>
  );
}
