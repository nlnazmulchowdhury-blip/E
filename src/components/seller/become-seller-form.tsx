"use client";

import { useActionState } from "react";
import { applyForSeller, type SellerState } from "@/lib/actions/seller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BecomeSellerForm() {
  const [state, formAction, pending] = useActionState<SellerState, FormData>(
    applyForSeller,
    {}
  );

  return (
    <form action={formAction} className="space-y-5 rounded-xl border bg-card p-6">
      <div>
        <Label htmlFor="shopName">শপের নাম *</Label>
        <Input id="shopName" name="shopName" placeholder="যেমন: ঢাকা ফ্যাশন হাউজ" />
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
          placeholder="আপনার শপে কী কী বিক্রি করবেন, কেন কাস্টমার আপনার কাছ থেকে কিনবে"
        />
        {state.errors?.description && (
          <p className="mt-1 text-xs text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="address">শপের ঠিকানা (ঐচ্ছিক)</Label>
        <Input id="address" name="address" placeholder="যেমন: ১২/এ, মিরপুর রোড, ঢাকা-১২১৬" />
        {state.errors?.address && (
          <p className="mt-1 text-xs text-destructive">{state.errors.address[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phone">মোবাইল নম্বর (ঐচ্ছিক)</Label>
        <Input id="phone" name="phone" placeholder="01XXXXXXXXX" />
        {state.errors?.phone && (
          <p className="mt-1 text-xs text-destructive">{state.errors.phone[0]}</p>
        )}
      </div>

      <div className="rounded-lg border bg-muted/40 p-4">
        <p className="mb-3 text-sm font-semibold">পেমেন্ট তথ্য (ঐচ্ছিক)</p>
        <p className="mb-4 text-xs text-muted-foreground">
          বিক্রির টাকা তুলতে এই তথ্য লাগবে — পরে সেটিংস থেকেও যোগ করতে পারবেন
        </p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="bkashNumber">বিকাশ নম্বর</Label>
            <Input id="bkashNumber" name="bkashNumber" placeholder="01XXXXXXXXX" />
            {state.errors?.bkashNumber && (
              <p className="mt-1 text-xs text-destructive">{state.errors.bkashNumber[0]}</p>
            )}
          </div>
          <div>
            <Label htmlFor="bankName">ব্যাংকের নাম</Label>
            <Input id="bankName" name="bankName" placeholder="যেমন: ডাচ্-বাংলা ব্যাংক" />
          </div>
          <div>
            <Label htmlFor="bankAccountName">অ্যাকাউন্টধারীর নাম</Label>
            <Input id="bankAccountName" name="bankAccountName" />
          </div>
          <div>
            <Label htmlFor="bankAccountNo">অ্যাকাউন্ট নম্বর</Label>
            <Input id="bankAccountNo" name="bankAccountNo" />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "জমা হচ্ছে..." : "আবেদন জমা দিন"}
      </Button>

      {state.message && !state.errors && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{state.message}</p>
      )}
    </form>
  );
}
