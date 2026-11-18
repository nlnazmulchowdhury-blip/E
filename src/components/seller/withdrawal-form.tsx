"use client";

import { useActionState } from "react";
import { requestWithdrawal, type SellerState } from "@/lib/actions/seller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WithdrawalForm({ balance }: { balance: number }) {
  const [state, formAction, pending] = useActionState<SellerState, FormData>(
    requestWithdrawal,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="amount">টাকার পরিমাণ</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          min="100"
          max={balance}
          step="1"
          placeholder="যেমন: 500"
        />
        {state.errors?.amount && (
          <p className="mt-1 text-xs text-destructive">{state.errors.amount[0]}</p>
        )}
      </div>
      <div>
        <Label htmlFor="method">পদ্ধতি</Label>
        <select
          id="method"
          name="method"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="">— নির্বাচন করুন —</option>
          <option value="BKASH">বিকাশ</option>
          <option value="BANK">ব্যাংক ট্রান্সফার</option>
        </select>
        {state.errors?.method && (
          <p className="mt-1 text-xs text-destructive">{state.errors.method[0]}</p>
        )}
      </div>
      <Button type="submit" disabled={pending || balance <= 0} className="w-full">
        {pending ? "জমা হচ্ছে..." : "উইথড্র রিকোয়েস্ট করুন"}
      </Button>
      {state.message && !state.errors && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{state.message}</p>
      )}
    </form>
  );
}
