"use client";

import { useActionState } from "react";
import { requestAdminRole, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BecomeAdminForm({ previousReason }: { previousReason?: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    requestAdminRole,
    {}
  );

  return (
    <form action={formAction} className="space-y-5 rounded-xl border bg-card p-6">
      <div>
        <Label htmlFor="reason">কেন অ্যাডমিন হতে চান? *</Label>
        <Textarea
          id="reason"
          name="reason"
          rows={4}
          defaultValue={previousReason ?? ""}
          placeholder="আপনার অভিজ্ঞতা বা দায়িত্ব সম্পর্কে লিখুন — অ্যাডমিন রিভিউ করে সিদ্ধান্ত নেবেন"
        />
        {state.errors?.reason && (
          <p className="mt-1 text-xs text-destructive">{state.errors.reason[0]}</p>
        )}
        {state.errors?.form && (
          <p className="mt-1 text-xs text-destructive">{state.errors.form[0]}</p>
        )}
      </div>

      {state.message && <p className="text-sm text-green-600">{state.message}</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "পাঠানো হচ্ছে..." : "রিকোয়েস্ট পাঠান"}
      </Button>
    </form>
  );
}
