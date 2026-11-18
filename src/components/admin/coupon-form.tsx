"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createCoupon,
  updateCoupon,
  type AdminState,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export type CouponDefaults = {
  code: string;
  type: string;
  value: string;
  minOrderAmount: string;
  maxUses: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export function CouponForm({
  defaults,
  couponId,
}: {
  defaults?: CouponDefaults;
  couponId?: string;
}) {
  const action = couponId ? updateCoupon.bind(null, couponId) : createCoupon;
  const [state, formAction, pending] = useActionState<AdminState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">কুপন কোড</Label>
          <Input
            id="code"
            name="code"
            defaultValue={defaults?.code}
            placeholder="WELCOME10"
          />
          {state.errors?.code && (
            <p className="mt-1 text-xs text-destructive">{state.errors.code[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="type">টাইপ</Label>
          <select
            id="type"
            name="type"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue={defaults?.type ?? "PERCENT"}
          >
            <option value="PERCENT">শতাংশ (%)</option>
            <option value="FIXED">নির্দিষ্ট টাকা (৳)</option>
          </select>
          {state.errors?.type && (
            <p className="mt-1 text-xs text-destructive">{state.errors.type[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="value">পরিমাণ</Label>
          <Input
            id="value"
            name="value"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaults?.value}
            placeholder="10"
          />
          {state.errors?.value && (
            <p className="mt-1 text-xs text-destructive">{state.errors.value[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="minOrderAmount">সর্বনিম্ন অর্ডার (ঐচ্ছিক)</Label>
          <Input
            id="minOrderAmount"
            name="minOrderAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaults?.minOrderAmount}
            placeholder="1000"
          />
          {state.errors?.minOrderAmount && (
            <p className="mt-1 text-xs text-destructive">{state.errors.minOrderAmount[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="maxUses">সর্বোচ্চ ব্যবহার (ঐচ্ছিক)</Label>
          <Input
            id="maxUses"
            name="maxUses"
            type="number"
            min="1"
            step="1"
            defaultValue={defaults?.maxUses}
            placeholder="100"
          />
          {state.errors?.maxUses && (
            <p className="mt-1 text-xs text-destructive">{state.errors.maxUses[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startsAt">শুরু (ঐচ্ছিক)</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={defaults?.startsAt}
          />
          {state.errors?.startsAt && (
            <p className="mt-1 text-xs text-destructive">{state.errors.startsAt[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="endsAt">শেষ (ঐচ্ছিক)</Label>
          <Input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={defaults?.endsAt}
          />
          {state.errors?.endsAt && (
            <p className="mt-1 text-xs text-destructive">{state.errors.endsAt[0]}</p>
          )}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <Checkbox
          name="isActive"
          className="size-4"
          defaultChecked={defaults ? defaults.isActive : true}
        />
        সক্রিয় (কাস্টমাররা ব্যবহার করতে পারবে)
      </label>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "জমা হচ্ছে..." : couponId ? "আপডেট করুন" : "কুপন তৈরি করুন"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/coupons">বাতিল</Link>
        </Button>
      </div>

      {state.message && !state.errors && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {state.message}{" "}
          <Link href="/admin/coupons" className="font-medium underline">
            কুপন লিস্টে যান
          </Link>
        </p>
      )}
    </form>
  );
}
