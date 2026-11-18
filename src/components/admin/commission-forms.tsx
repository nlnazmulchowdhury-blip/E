"use client";

import { useActionState } from "react";
import {
  updateDefaultCommission,
  updateCommissionRate,
  type AdminState,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DefaultCommissionForm({ currentRate }: { currentRate: number }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    updateDefaultCommission,
    {}
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="rate" className="mb-1.5 block">
          ডিফল্ট কমিশন হার (%)
        </Label>
        <Input
          id="rate"
          name="rate"
          type="number"
          min="0"
          max="100"
          step="0.5"
          defaultValue={String(currentRate)}
          className="w-32"
        />
        {state.errors?.rate && (
          <p className="mt-1 text-xs text-destructive">{state.errors.rate[0]}</p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "সেভ হচ্ছে..." : "সেভ করুন"}
      </Button>
      {state.message && !state.errors && (
        <span className="text-sm text-emerald-700">{state.message}</span>
      )}
    </form>
  );
}

export function SellerRateForm({
  sellerId,
  currentRate,
}: {
  sellerId: string;
  currentRate: number;
}) {
  const action = updateCommissionRate.bind(null, sellerId);
  const [state, formAction, pending] = useActionState<AdminState, FormData>(action, {});

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Input
        name="rate"
        type="number"
        min="0"
        max="100"
        step="0.5"
        defaultValue={String(currentRate)}
        className="w-24"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "..." : "সেভ"}
      </Button>
    </form>
  );
}
